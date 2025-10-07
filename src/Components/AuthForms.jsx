import React, { useState } from 'react';

const LoginForm = ({ onLogin, authError, switchToRegister }) => {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');

  const handleSubmit = (e) => {
    e.preventDefault();
    onLogin(username, password);
  };

  return (
    <div className="auth-form">
      <h4 className="naka-midashi">Login</h4>
      <form onSubmit={handleSubmit}>
        <input
          type="text"
          placeholder="Username"
          value={username}
          onChange={(e) => setUsername(e.target.value)}
          required
        />
        <input
          type="password"
          placeholder="Password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          required
        />
        {authError && (
          <p style={{ color: '#ff6b6b', fontSize: '0.9em' }}>{authError}</p>
        )}
        <button type="submit">Log In</button>
      </form>
      <p style={{ fontSize: '0.9em', marginTop: '10px' }}>
        Don’t have an account?{' '}
        <button
          type="button"
          onClick={switchToRegister}
          style={{
            textDecoration: 'underline',
            background: 'none',
            border: 'none',
            color: 'blue',
            cursor: 'pointer',
          }}
        >
          Register here
        </button>
      </p>
    </div>
  );
};

const RegistrationForm = ({ onRegister, switchToLogin, authError }) => {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');

  const handleSubmit = (e) => {
    e.preventDefault();
    onRegister(username, password);
  };

  return (
    <div className="auth-form">
      <h4 className="naka-midashi">Register</h4>
      <form onSubmit={handleSubmit}>
        <input
          type="text"
          placeholder="New Username"
          value={username}
          onChange={(e) => setUsername(e.target.value)}
          required
        />
        <input
          type="password"
          placeholder="New Password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          required
        />
        {authError && (
          <p style={{ color: '#ff6b6b', fontSize: '0.9em' }}>{authError}</p>
        )}
        <button type="submit">Register</button>
      </form>
      <p style={{ fontSize: '0.9em', marginTop: '10px' }}>
        Already have an account?{' '}
        <button
          type="button"
          onClick={switchToLogin}
          style={{
            textDecoration: 'underline',
            background: 'none',
            border: 'none',
            color: 'blue',
            cursor: 'pointer',
          }}
        >
          Log in here
        </button>
      </p>
    </div>
  );
};

const UserInfo = ({ currentUser, handleLogout }) => (
  <div className="userInformation-header">
    Logged in as: <strong>{currentUser}</strong>
    <button onClick={handleLogout} style={{ marginLeft: '15px' }}>
      Logout
    </button>
  </div>
);

export { LoginForm, RegistrationForm, UserInfo };