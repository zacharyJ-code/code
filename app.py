from flask import Flask, request, jsonify
from flask_mail import Mail, Message
from models import db, User
import secrets

app = Flask(__name__)

# 配置
app.config['SECRET_KEY'] = 'your-secret-key'
app.config['SQLALCHEMY_DATABASE_URI'] = 'sqlite:///users.db'
app.config['SQLALCHEMY_TRACK_MODIFICATIONS'] = False

# 邮件配置
app.config['MAIL_SERVER'] = 'smtp.gmail.com'
app.config['MAIL_PORT'] = 587
app.config['MAIL_USE_TLS'] = True
app.config['MAIL_USERNAME'] = 'your-email@gmail.com'
app.config['MAIL_PASSWORD'] = 'your-email-password'

db.init_app(app)
mail = Mail(app)

# 注册路由
@app.route('/register', methods=['POST'])
def register():
    data = request.get_json()
    
    if not all(k in data for k in ['username', 'email', 'password']):
        return jsonify({'error': '缺少必要字段'}), 400
        
    if User.query.filter_by(username=data['username']).first():
        return jsonify({'error': '用户名已存在'}), 400
        
    if User.query.filter_by(email=data['email']).first():
        return jsonify({'error': '邮箱已被注册'}), 400
    
    user = User(username=data['username'], email=data['email'])
    user.set_password(data['password'])
    
    db.session.add(user)
    db.session.commit()
    
    return jsonify({'message': '注册成功'}), 201

# 登录路由
@app.route('/login', methods=['POST'])
def login():
    data = request.get_json()
    
    if not all(k in data for k in ['username', 'password']):
        return jsonify({'error': '缺少必要字段'}), 400
    
    user = User.query.filter_by(username=data['username']).first()
    
    if user and user.check_password(data['password']):
        return jsonify({'message': '登录成功'}), 200
    
    return jsonify({'error': '用户名或密码错误'}), 401

# 重置密码路由
@app.route('/reset-password', methods=['POST'])
def reset_password():
    data = request.get_json()
    
    if 'email' not in data:
        return jsonify({'error': '请提供邮箱地址'}), 400
    
    user = User.query.filter_by(email=data['email']).first()
    
    if not user:
        return jsonify({'error': '该邮箱未注册'}), 404
    
    # 生成临时密码
    temp_password = secrets.token_urlsafe(8)
    user.set_password(temp_password)
    
    # 发送重置密码邮件
    msg = Message('密码重置',
                  sender='your-email@gmail.com',
                  recipients=[user.email])
    msg.body = f'您的临时密码是: {temp_password}\n请登录后立即修改密码。'
    
    try:
        mail.send(msg)
        db.session.commit()
        return jsonify({'message': '新密码已发送到您的邮箱'}), 200
    except Exception as e:
        db.session.rollback()
        return jsonify({'error': '发送邮件失败'}), 500

# 创建数据库表
with app.app_context():
    db.create_all()

if __name__ == '__main__':
    app.run(debug=True) 


#pip install flask flask-sqlalchemy flask-mail werkzeug