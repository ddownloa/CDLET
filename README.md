# 科目一英文题库 · 模拟考试网页

纯前端静态网页，从科目一英文版题库 PDF 自动提取生成，共 **973** 道题（含判断题 Right/Wrong 与图文单选题 A/B/C/D，495 题带配图）。无需任何后台，可直接部署到 GitHub Pages。

## 功能

- 每次测试从 973 题题库中随机抽取 **100 题**（每次不同）
- 倒计时 **45 分钟**，时间到自动交卷
- 自动评分，**100 分制**，每题 1 分
- **90 分及以上 PASS**
- 交卷后**错题回顾**，可切换只看错题 / 查看全部题目
- 所有题目都会显示**正确答案**
- 顶部**进度条**（道路+车辆动画）
- **答题卡**支持 100 题快速跳转（移动端为侧滑抽屉，桌面端为常驻侧栏）
- 作答进度**自动保存**在浏览器 localStorage，刷新页面不会丢失，关闭浏览器后台计时仍按真实时间继续
- **深色模式**（右上角按钮，或跟随系统设置）
- **响应式设计**，适配电脑 / 平板 / 手机

## 目录结构

```
quiz-app/
├── index.html          页面结构
├── css/style.css        样式（公路标志主题）
├── js/questions.js      题库数据（973题，自动生成）
├── js/app.js            应用逻辑（考试流程/计时/评分/存储）
├── images/              题目配图（495张 png）
└── README.md
```

## 本地预览

由于使用了原生 `<script>` 引入题库数据（而非 `fetch`），**可以直接双击 `index.html` 在浏览器打开**，无需启动本地服务器。

也可以用任意静态服务器预览，例如：

```bash
cd quiz-app
python3 -m http.server 8080
# 然后浏览器打开 http://localhost:8080
```

## 部署到 GitHub Pages

1. 在 GitHub 新建一个仓库，例如 `subject1-quiz`
2. 把本文件夹（`quiz-app` 下的所有文件，包括 `images/`）上传 / push 到该仓库的根目录（或 `docs/` 目录）
3. 进入仓库 **Settings → Pages**
4. **Source** 选择 `Deploy from a branch`，Branch 选择 `main`，目录选择 `/ (root)`（如果放在 `docs/` 目录则选 `/docs`）
4. 保存后等待 1-2 分钟，即可通过 `https://<你的用户名>.github.io/<仓库名>/` 访问

示例 git 命令：

```bash
git init
git add .
git commit -m "科目一英文题库模拟考试"
git branch -M main
git remote add origin https://github.com/<你的用户名>/<仓库名>.git
git push -u origin main
```

然后在仓库设置里开启 Pages 即可。

## 题库来源与数据说明

题目、选项、正确答案与配图均通过程序化方式从原始 PDF（科目一英文题库）中提取，未做人工内容改写。若发现个别题目文字提取有细微换行 / 空格问题，可直接编辑 `js/questions.js` 中对应题目的 `stem` / `options` 字段修正（是一份普通 JS 数组，格式如下）：

```js
const QUESTIONS = [
  { "id":1, "stem":"...", "type":"tf", "options":null, "answer":"Right", "image":null },
  { "id":700, "stem":"What's the meaning of this sign?", "type":"choice",
    "options":{"A":"...","B":"...","C":"...","D":"..."}, "answer":"D", "image":"q0700.png" },
  ...
];
```

- `type`: `"tf"`（判断题，答案为 `Right`/`Wrong`）或 `"choice"`（单选题，答案为 `A`/`B`/`C`/`D`）
- `image`: 对应 `images/` 目录下的文件名，无配图为 `null`

## 常见问题

**Q: 修改及格分数线或考试时长？**
在 `js/app.js` 顶部修改：

```js
var TOTAL_PICK   = 100;      // 每次抽取题数
var PASS_SCORE   = 90;       // 合格分数线
var DURATION_MS  = 45*60*1000; // 考试时长（毫秒）
```

**Q: 想清空本地保存的进度重新开始？**
浏览器控制台执行 `localStorage.clear()`，或在开始页点击"开始测试"（会清空之前未交卷的记录并重新抽题）。
