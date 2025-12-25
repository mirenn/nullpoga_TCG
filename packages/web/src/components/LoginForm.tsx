import React, { useState } from 'react';
import { useAuth } from '../context/authContext';

const LoginForm: React.FC = () => {
  const [username, setUsername] = useState('');
  const { login } = useAuth();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await login(username);
      // ログイン成功時の処理（例：メッセージ表示など）
    } catch (error) {
      // エラー処理
      console.error('Login failed:', error);
    }
  };

  return (
    <form onSubmit={handleSubmit}>
      <input
        type="text"
        value={username}
        onChange={(e) => setUsername(e.target.value)}
        placeholder="ユーザー名を入力"
      />
      <button type="submit">ログイン</button>
    </form>
  );
};

export default LoginForm;