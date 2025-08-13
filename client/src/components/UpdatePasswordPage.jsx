// components/UpdatePasswordPage.js - Updated version

import { useState, useEffect } from 'react';
import { apiService } from '../services/api';
import './UpdatePasswordPage.css'; // Make sure this CSS file exists

const UpdatePasswordPage = () => {
  const [accessToken, setAccessToken] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [initializing, setInitializing] = useState(true);

  useEffect(() => {
    const initializePasswordReset = async () => {
      try {
        console.log('=== UpdatePasswordPage Initialize ===');
        console.log('Current URL:', window.location.href);
        console.log('Search params:', window.location.search);
        console.log('Hash:', window.location.hash);

        const urlParams = new URLSearchParams(window.location.search);
        
        // Method 1: Direct access token (most common)
        let token = urlParams.get('access_token');
        const type = urlParams.get('type');
        const code = urlParams.get('code');
        
        console.log('URL params parsed:', {
          access_token: token ? token.substring(0, 10) + '...' : 'MISSING',
          type: type,
          code: code ? code.substring(0, 10) + '...' : 'MISSING'
        });

        // Method 2: If we have a code instead of direct token, exchange it
        if (!token && code && type === 'recovery') {
          console.log('Found recovery code, exchanging for session...');
          try {
            const response = await fetch(`${apiService.API_BASE_URL}/api/auth/exchange-reset-code`, {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
              },
              body: JSON.stringify({ code }),
            });

            const data = await response.json();

            if (!response.ok) {
              throw new Error(data.error || 'Code exchange failed');
            }

            token = data.access_token;
            console.log('Code exchange successful, got token:', token ? token.substring(0, 10) + '...' : 'MISSING');

          } catch (codeError) {
            console.error('Code exchange failed:', codeError);
            setError('ლინკი არასწორია ან ვადაგასულია. გთხოვთ, ხელახლა მოითხოვოთ პაროლის აღდგენა.');
            setInitializing(false);
            return;
          }
        }

        // Method 3: Check URL hash as fallback (some OAuth flows use this)
        if (!token && window.location.hash) {
          console.log('Checking URL hash for tokens...');
          const hashParams = new URLSearchParams(window.location.hash.slice(1));
          const hashToken = hashParams.get('access_token');
          const hashType = hashParams.get('type');
          
          if (hashToken && hashType === 'recovery') {
            token = hashToken;
            console.log('Found token in hash:', token.substring(0, 10) + '...');
          }
        }

        // Validate we have a token
        if (!token) {
          console.error('No access token found in any location');
          setError('არასწორი ან ვადაგასული ლინკი. გთხოვთ, ხელახლა მოითხოვოთ პაროლის აღდგენა.');
          setInitializing(false);
          return;
        }

        // Validate this is a recovery token
        if (type && type !== 'recovery') {
          console.error('Invalid token type:', type);
          setError('არასწორი ლინკის ტიპი. გთხოვთ, გამოიყენოთ პაროლის აღდგენის ლინკი.');
          setInitializing(false);
          return;
        }

        console.log('Password reset initialized successfully with token');
        setAccessToken(token);
        
        // Clean up URL
        window.history.replaceState({}, document.title, '/update-password');

      } catch (err) {
        console.error('Password reset initialization error:', err);
        setError('ლინკის ვერიფიკაციის შეცდომა. გთხოვთ, სცადოთ ხელახლა.');
      } finally {
        setInitializing(false);
      }
    };

    initializePasswordReset();
  }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    // Validation
    if (!newPassword || !confirmPassword) {
      setError('გთხოვთ, შეავსოთ ყველა ველი.');
      return;
    }

    if (newPassword !== confirmPassword) {
      setError('პაროლები არ ემთხვევა.');
      return;
    }

    if (newPassword.length < 6) {
      setError('პაროლი უნდა იყოს მინიმუმ 6 სიმბოლო.');
      return;
    }

    // Password strength validation
    if (!/(?=.*[a-z])/.test(newPassword)) {
      setError('პაროლი უნდა შეიცავდეს მინიმუმ ერთ პატარა ასოს.');
      return;
    }

    setLoading(true);

    try {
      console.log('Submitting password update...');
      
      const response = await fetch(`${apiService.API_BASE_URL}/api/auth/update-password`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          access_token: accessToken,
          new_password: newPassword
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'პაროლის შეცვლა ვერ მოხერხდა');
      }

      console.log('Password update successful');
      setSuccess(true);
      
      // Show success message and redirect after delay
      setTimeout(() => {
        window.location.href = '/?message=password_updated&type=success';
      }, 3000);

    } catch (err) {
      console.error('Password update error:', err);
      setError(err.message || 'პაროლის შეცვლა ვერ მოხერხდა. გთხოვთ, სცადოთ ხელახლა.');
    } finally {
      setLoading(false);
    }
  };

  const handleBack = () => {
    window.location.href = '/';
  };

  // Loading state
  if (initializing) {
    return (
      <div className="update-password-container">
        <div className="update-password-card">
          <div className="loading-state">
            <div className="loading-spinner large"></div>
            <h2>ლინკის ვერიფიკაცია</h2>
            <p>მიმდინარეობს პაროლის აღდგენის ლინკის შემოწმება...</p>
          </div>
        </div>
      </div>
    );
  }

  // Error state (invalid/expired link)
  if (!accessToken && error) {
    return (
      <div className="update-password-container">
        <div className="update-password-card">
          <div className="error-state">
            <div className="error-icon">❌</div>
            <h2>ლინკი არასწორია</h2>
            <p>{error}</p>
            <button onClick={handleBack} className="back-button">
              მთავარ გვერდზე დაბრუნება
            </button>
          </div>
        </div>
      </div>
    );
  }

  // Success state
  if (success) {
    return (
      <div className="update-password-container">
        <div className="update-password-card">
          <div className="success-state">
            <div className="success-icon">✅</div>
            <h2>პაროლი განახლდა!</h2>
            <p>თქვენი პაროლი წარმატებით შეიცვალა. გადამისამართება მთავარ გვერდზე...</p>
            <div className="loading-spinner"></div>
            <div className="countdown">
              გადამისამართება 3 წამში...
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Main form
  return (
    <div className="update-password-container">
      <div className="update-password-card">
        <div className="card-header">
          <h2>ახალი პაროლის შექმნა</h2>
          <button onClick={handleBack} className="close-button" disabled={loading}>✕</button>
        </div>

        <form onSubmit={handleSubmit} className="password-form">
          {error && (
            <div className="error-message">
              <span className="error-icon">⚠️</span>
              <p>{error}</p>
            </div>
          )}

          <div className="form-group">
            <label htmlFor="newPassword">ახალი პაროლი *</label>
            <input
              type="password"
              id="newPassword"
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              placeholder="მინიმუმ 6 სიმბოლო"
              required
              minLength={6}
              disabled={loading}
              className={error && error.includes('პაროლ') ? 'error' : ''}
            />
            <div className="input-hint">
              პაროლი უნდა შეიცავდეს მინიმუმ 6 სიმბოლოს და მინიმუმ ერთ ასოს
            </div>
          </div>

          <div className="form-group">
            <label htmlFor="confirmPassword">პაროლის დადასტურება *</label>
            <input
              type="password"
              id="confirmPassword"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              placeholder="გაიმეორეთ ახალი პაროლი"
              required
              minLength={6}
              disabled={loading}
              className={error && error.includes('ემთხვევა') ? 'error' : ''}
            />
          </div>

          <button
            type="submit"
            disabled={loading || !newPassword || !confirmPassword}
            className="submit-button"
          >
            {loading ? (
              <span className="button-loading">
                <div className="button-spinner"></div>
                იტვირთება...
              </span>
            ) : (
              'პაროლის შეცვლა'
            )}
          </button>
        </form>

        <div className="form-footer">
          <button onClick={handleBack} className="link-button" disabled={loading}>
            ← მთავარ გვერდზე დაბრუნება
          </button>
        </div>
      </div>
    </div>
  );
};
 
export default UpdatePasswordPage;