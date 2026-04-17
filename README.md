# 多源气象卫星降水数据一体化处理与时空匹配系统

## 项目简介

本项目是一个基于 Electron + React + Python 的桌面应用程序，用于处理多源气象卫星降水数据（FY3G-PMR、GPM-DPR、CLDAS），实现数据导入、格式转换、时空匹配和精度评估等功能。

## 系统架构

- **前端**: Electron + React 18
- **后端**: Python 3.8+
- **构建工具**: electron-builder

## 功能模块

1. **数据导入** - 支持 HDF5、NetCDF 格式文件导入
2. **格式转换** - HDF5→CSV、NetCDF→GeoTIFF
3. **时空匹配** - 网格对齐法、最近邻搜索法
4. **精度评估** - POD、FAR、CSI、CC、RMSE、RB 六指标
5. **结果导出** - CSV、GeoTIFF、PNG 格式

## 安装与运行

### 开发环境

```bash
# 安装依赖
npm install

# 开发模式运行
npm run dev

# 生产模式运行
npm start
```

### Python依赖

```bash
cd python
pip install -r requirements.txt
```

### 打包构建

```bash
# Windows打包
npm run dist

# 或
npm run build:win
```

## 目录结构

```
PrecipMatchSystem/
├── main.js              # Electron主进程
├── preload.js           # 预加载脚本
├── package.json         # 项目配置
├── src/                 # 前端源码
│   ├── App.jsx         # React主组件
│   ├── index.html      # 入口HTML
│   ├── styles/         # CSS样式
│   └── utils/          # 工具函数
├── python/             # Python算法模块
│   ├── grid_align_match.py
│   ├── hdf_to_csv.py
│   ├── nc_to_tif.py
│   ├── accuracy_eval.py
│   └── requirements.txt
└── assets/             # 静态资源
```

## 技术特点

- 深蓝色科技风格UI设计
- 支持拖拽上传文件
- 实时进度显示
- 响应式布局
- 跨平台支持（Windows、macOS、Linux）

## 作者

河海大学

## 许可证

MIT