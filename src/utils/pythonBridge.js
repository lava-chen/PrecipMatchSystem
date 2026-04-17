/**
 * PythonBridge - Python脚本调用桥接层
 * 通过 child_process.spawn 调用 Python 脚本，传递参数并实时返回进度信息
 */

const { spawn } = require('child_process');
const path = require('path');
const fs = require('fs');

// Python脚本映射表
const SCRIPT_MAP = {
  hdf_to_csv: 'hdf_to_csv.py',
  clean_data: 'clean_data.py',
  nc_to_tif: 'nc_to_tif.py',
  grid_align_match: 'grid_align_match.py',
  accuracy_eval: 'accuracy_eval.py'
};

// 脚本参数映射
const PARAM_MAP = {
  hdf_to_csv: {
    input: '--input',
    output: '--output'
  },
  clean_data: {
    input: '--input',
    output: '--output'
  },
  nc_to_tif: {
    input: '--input',
    output: '--output'
  },
  grid_align_match: {
    input_dpr: '--input-dpr',
    input_cldas: '--input-cldas',
    output: '--output',
    method: '--method',
    tolerance: '--tolerance',
    resolution: '--resolution',
    time_window: '--time-window',
    lat_min: '--lat-min',
    lat_max: '--lat-max',
    lon_min: '--lon-min',
    lon_max: '--lon-max'
  },
  accuracy_eval: {
    input: '--input',
    output: '--output',
    quarter: '--quarter',
    threshold: '--threshold',
    metrics: '--metrics'
  }
};

class PythonBridge {
  constructor() {
    this.pythonPath = 'python3';
    this.pythonDir = path.join(__dirname, '..', 'python');
    this.activeProcesses = new Map();
  }

  /**
   * 设置Python解释器路径
   * @param {string} pythonPath - Python解释器路径
   */
  setPythonPath(pythonPath) {
    this.pythonPath = pythonPath;
  }

  /**
   * 设置Python脚本目录
   * @param {string} pythonDir - Python脚本目录路径
   */
  setPythonDir(pythonDir) {
    this.pythonDir = pythonDir;
  }

  /**
   * 执行Python脚本
   * @param {string} scriptName - 脚本名称（对应SCRIPT_MAP中的key）
   * @param {Object} params - 参数对象
   * @param {Function} onProgress - 进度回调函数 (percent: number) => void
   * @returns {Promise<Object>} - { success: boolean, output?: string, error?: string, data?: any }
   */
  execute(scriptName, params, onProgress) {
    return new Promise((resolve, reject) => {
      const scriptFile = SCRIPT_MAP[scriptName];
      if (!scriptFile) {
        reject(new Error(`未知脚本: ${scriptName}`));
        return;
      }

      const scriptPath = path.join(this.pythonDir, scriptFile);
      if (!fs.existsSync(scriptPath)) {
        reject(new Error(`脚本文件不存在: ${scriptPath}`));
        return;
      }

      // 构建命令行参数
      const args = [scriptPath];
      const paramMapping = PARAM_MAP[scriptName] || {};

      for (const [key, value] of Object.entries(params)) {
        if (value === undefined || value === null || value === '') continue;

        const argName = paramMapping[key];
        if (argName) {
          args.push(argName);
          if (Array.isArray(value)) {
            args.push(value.join(','));
          } else {
            args.push(String(value));
          }
        }
      }

      console.log(`[PythonBridge] 执行: ${this.pythonPath} ${args.join(' ')}`);

      // 启动Python进程
      const proc = spawn(this.pythonPath, args, {
        cwd: this.pythonDir,
        env: { ...process.env, PYTHONIOENCODING: 'utf-8' },
        stdio: ['pipe', 'pipe', 'pipe']
      });

      const processId = `${Date.now()}_${scriptName}`;
      this.activeProcesses.set(processId, proc);

      let stdout = '';
      let stderr = '';
      let lastProgress = 0;

      // 实时读取stdout
      proc.stdout.on('data', (data) => {
        const text = data.toString('utf-8');
        stdout += text;
        console.log(`[Python stdout] ${text.trim()}`);

        // 解析进度信息
        // 支持格式: PROGRESS:50 或 [PROGRESS] 50%
        const progressMatch = text.match(/PROGRESS[:\s]*(\d+)/i);
        if (progressMatch) {
          const percent = parseInt(progressMatch[1]);
          if (onProgress && percent >= lastProgress) {
            lastProgress = percent;
            onProgress(percent);
          }
        }

        // 解析百分比格式
        const percentMatch = text.match(/(\d+)%/);
        if (percentMatch && !progressMatch) {
          const percent = parseInt(percentMatch[1]);
          if (onProgress && percent >= lastProgress) {
            lastProgress = percent;
            onProgress(percent);
          }
        }
      });

      // 读取stderr
      proc.stderr.on('data', (data) => {
        const text = data.toString('utf-8');
        stderr += text;
        console.error(`[Python stderr] ${text.trim()}`);
      });

      // 进程结束
      proc.on('close', (code) => {
        this.activeProcesses.delete(processId);

        if (code === 0) {
          // 尝试解析JSON输出
          let resultData = null;
          try {
            const jsonMatch = stdout.match(/\{[\s\S]*\}/);
            if (jsonMatch) {
              resultData = JSON.parse(jsonMatch[0]);
            }
          } catch (e) {
            // 非JSON输出，忽略
          }

          resolve({
            success: true,
            output: stdout.trim(),
            data: resultData,
            matchCount: resultData?.match_count,
            totalPoints: resultData?.total_points
          });
        } else {
          resolve({
            success: false,
            error: stderr.trim() || `进程退出码: ${code}`,
            output: stdout.trim()
          });
        }
      });

      // 进程错误
      proc.on('error', (err) => {
        this.activeProcesses.delete(processId);
        resolve({
          success: false,
          error: `启动Python进程失败: ${err.message}`
        });
      });
    });
  }

  /**
   * 终止所有活跃的Python进程
   */
  terminateAll() {
    for (const [id, proc] of this.activeProcesses) {
      try {
        proc.kill('SIGTERM');
      } catch (e) {
        console.error(`终止进程 ${id} 失败:`, e.message);
      }
    }
    this.activeProcesses.clear();
  }

  /**
   * 终止指定进程
   * @param {string} processId - 进程ID
   */
  terminate(processId) {
    const proc = this.activeProcesses.get(processId);
    if (proc) {
      try {
        proc.kill('SIGTERM');
      } catch (e) {
        console.error(`终止进程 ${processId} 失败:`, e.message);
      }
      this.activeProcesses.delete(processId);
    }
  }

  /**
   * 检查Python环境是否可用
   * @returns {Promise<Object>} - { available: boolean, version?: string, error?: string }
   */
  async checkPython() {
    return new Promise((resolve) => {
      const proc = spawn(this.pythonPath, ['--version'], {
        stdio: ['pipe', 'pipe', 'pipe']
      });

      let stdout = '';
      let stderr = '';

      proc.stdout.on('data', (data) => { stdout += data.toString(); });
      proc.stderr.on('data', (data) => { stderr += data.toString(); });

      proc.on('close', (code) => {
        const version = (stdout || stderr).trim();
        resolve({
          available: code === 0,
          version: version,
          error: code !== 0 ? 'Python环境不可用' : undefined
        });
      });

      proc.on('error', (err) => {
        resolve({
          available: false,
          error: `无法启动Python: ${err.message}`
        });
      });
    });
  }

  /**
   * 检查Python依赖是否已安装
   * @returns {Promise<Object>} - { installed: boolean, missing?: string[] }
   */
  async checkDependencies() {
    const required = ['numpy', 'h5py', 'netCDF4', 'gdal', 'pandas', 'scipy'];
    const missing = [];

    for (const pkg of required) {
      const result = await new Promise((resolve) => {
        const proc = spawn(this.pythonPath, ['-c', `import ${pkg}`], {
          stdio: ['pipe', 'pipe', 'pipe']
        });
        proc.on('close', (code) => resolve(code === 0));
        proc.on('error', () => resolve(false));
      });
      if (!result) {
        missing.push(pkg);
      }
    }

    return {
      installed: missing.length === 0,
      missing
    };
  }
}

// 创建全局单例
const pythonBridge = new PythonBridge();

// 导出到渲染进程（通过preload.js的contextBridge）
if (typeof window !== 'undefined') {
  window.pythonBridge = pythonBridge;
}

// CommonJS 导出
module.exports = PythonBridge;