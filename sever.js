const express = require('express');
const bodyParser = require('body-parser');
const path = require('path');
const crypto = require('crypto');
const nodemailer = require('nodemailer');

const app = express();
const PORT = 3000;

// 中间件
app.use(bodyParser.json());
app.use(express.static(path.join(__dirname, 'public')));

// 模拟数据库
const users = [];
const resetTokens = {};

// 生成随机令牌
function generateToken() {
  return crypto.randomBytes(20).toString('hex');
}

// 模拟邮件发送服务
const transporter = nodemailer.createTransport({
  host: "smtp.example.com",
  port: 587,
  auth: {
    user: "your_email@example.com",
    pass: "your_email_password"
  }
});

// 登录接口
app.post('/login', (req, res) => {
  const { username, password } = req.body;
  
  // 查找用户
  const user = users.find(u => 
    u.username === username && u.password === password
  );

  if (user) {
    res.json({ 
      success: true, 
      message: '登录成功',
      user: { username: user.username, email: user.email }
    });
  } else {
    res.json({ 
      success: false, 
      message: '用户名或密码错误' 
    });
  }
});

// 注册接口
app.post('/register', (req, res) => {
  const { username, email, password } = req.body;
  
  // 检查用户是否已存在
  const existingUser = users.find(u => 
    u.username === username || u.email === email
  );

  if (existingUser) {
    return res.json({ 
      success: false, 
      message: '用户名或邮箱已被注册' 
    });
  }

  // 创建新用户
  const newUser = { username, email, password };
  users.push(newUser);

  res.json({ 
    success: true, 
    message: '注册成功' 
  });
});

// 忘记密码接口
app.post('/forgot-password', (req, res) => {
  const { email } = req.body;
  
  // 查找用户
  const user = users.find(u => u.email === email);

  if (!user) {
    return res.json({ 
      success: false, 
      message: '未找到该邮箱对应的用户' 
    });
  }

  // 生成重置令牌
  const resetToken = generateToken();
  resetTokens[email] = {
    token: resetToken,
    createdAt: Date.now()
  };

  // 发送重置邮件（模拟）
  const resetLink = `http://localhost:${PORT}/reset-password?token=${resetToken}`;

  try {
    // 实际环境中使用真实的邮件发送
    transporter.sendMail({
      from: '"密码重置" <noreply@example.com>',
      to: email,
      subject: "密码重置",
      text: `点击以下链接重置密码: ${resetLink}`,
      html: `<p>点击以下链接重置密码:</p><a href="${resetLink}">重置密码</a>`
    });

    res.json({ 
      success: true, 
      message: '重置链接已发送' 
    });
  } catch (error) {
    res.json({ 
      success: false, 
      message: '发送重置链接失败' 
    });
  }
});

// 重置密码接口
app.post('/reset-password', (req, res) => {
  const { token, newPassword } = req.body;
  
  // 查找对应的重置令牌
  const tokenInfo = Object.entries(resetTokens).find(
    ([, info]) => info.token === token
  );

  if (!tokenInfo) {
    return res.json({ 
      success: false, 
      message: '无效的重置令牌' 
    });
  }

  const [email, info] = tokenInfo;

  // 检查令牌是否过期（1小时内有效）
  if (Date.now() - info.createdAt > 3600000) {
    delete resetTokens[email];
    return res.json({ 
      success: false, 
      message: '重置令牌已过期' 
    });
  }

  // 更新用户密码
  const userIndex = users.findIndex(u => u.email === email);
  if (userIndex !== -1) {
    users[userIndex].password = newPassword;
  }

  // 清除重置令牌
  delete resetTokens[email];

  res.json({ 
    success: true, 
    message: '密码重置成功' 
  });
});

// 主页路由
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// 启动服务器
app.listen(PORT, () => {
  console.log(`服务器运行在 http://localhost:${PORT}`);
});

// npm install express body-parser nodemailer