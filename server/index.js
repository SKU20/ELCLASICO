import express from 'express';
import path from 'path';
import cors from 'cors';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';
import { createClient } from '@supabase/supabase-js';

dotenv.config();

const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_ANON_KEY = process.env.SUPABASE_ANON_KEY;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

const FRONTEND_URL = process.env.FRONTEND_URL || 'http://localhost:3000';
const BACKEND_URL = process.env.BACKEND_URL || 'http://localhost:3000';
const NODE_ENV = process.env.NODE_ENV || 'development';

if (!SUPABASE_URL || !SUPABASE_ANON_KEY || !SUPABASE_SERVICE_ROLE_KEY) {
  console.error('Missing Supabase environment variables. Please check your .env file.');
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
const supabaseAdmin = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

const getRedirectUrl = (req, provider) => {
  if (BACKEND_URL && BACKEND_URL !== 'http://localhost:3000') {
    return `${BACKEND_URL}/api/auth/callback/${provider}`;
  }
  
  return `${req.protocol}://${req.get('host')}/api/auth/callback/${provider}`;
};

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(express.json());

const authenticateUser = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ error: 'No token provided' });
    }

    const token = authHeader.substring(7);
    const { data: { user }, error } = await supabase.auth.getUser(token);

    if (error || !user) {
      return res.status(401).json({ error: 'Invalid token' });
    }

    req.user = user;
    next();
  } catch (err) {
    res.status(401).json({ error: 'Authentication failed' });
  }
};

app.get('/api/products', async (req, res) => {
  try {
    const { data, error } = await supabase.from('products').select('*');
    
    if (error) {
      return res.status(400).json({ error: error.message });
    }
    
    res.json(data);
  } catch (err) {
    res.status(500).json({ error: 'Internal server error' });
  }
});

app.get('/api/products/bestsellers', async (req, res) => {
  try {
    const { data, error } = await supabase
      .from('products')
      .select('*')
      .order('discount', { ascending: false })
      .limit(4);
    
    if (error) {
      return res.status(400).json({ error: error.message });
    }
    
    res.json(data);
  } catch (err) {
    res.status(500).json({ error: 'Internal server error' });
  }
});

app.get('/api/products/available-sizes', async (req, res) => {
  try {
    const { data, error } = await supabase
      .from('products')
      .select('sizes')
      .not('sizes', 'is', null);
    
    if (error) {
      return res.status(400).json({ error: error.message });
    }
    
    const allSizes = new Set();
    
    data.forEach(product => {
      if (product.sizes) {
        try {
          let parsedSizes = [];
          
          if (typeof product.sizes === 'string') {
            try {
              parsedSizes = JSON.parse(product.sizes);
            } catch (jsonError) {
              parsedSizes = product.sizes.split(',').map(size => size.trim());
            }
          } else if (Array.isArray(product.sizes)) {
            parsedSizes = product.sizes;
          }
          
          parsedSizes.forEach(size => {
            if (size && size !== '') {
              allSizes.add(size.toString().trim());
            }
          });
          
        } catch (parseError) {
          console.error('Error parsing sizes:', parseError, product.sizes);
        }
      }
    });
    
    const sortedSizes = Array.from(allSizes).sort((a, b) => {
      const numA = parseFloat(a);
      const numB = parseFloat(b);
      
      if (!isNaN(numA) && !isNaN(numB)) {
        return numA - numB;
      }
      
      return a.localeCompare(b);
    });
    
    res.json({
      success: true,
      sizes: sortedSizes,
      count: sortedSizes.length
    });
    
  } catch (err) {
    console.error('Server error fetching available sizes:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

app.get('/api/products/filter', async (req, res) => {
  try {
    const { brands, genders, types, sizes } = req.query;
    
    let query = supabase.from('products').select('*');
    
    if (brands) {
      const brandsArray = brands.split(',');
      query = query.in('brand', brandsArray);
    }
    
    if (genders) {
      const gendersArray = genders.split(',');
      query = query.in('gender', gendersArray);
    }
    
    if (types) {
      const typesArray = types.split(',');
      query = query.in('type', typesArray);
    }
    
    const { data, error } = await query;
    
    if (error) {
      return res.status(400).json({ error: error.message });
    }
    
    let filteredData = data;
    if (sizes) {
      const requestedSizes = sizes.split(',').map(s => s.trim());
      
      filteredData = data.filter(product => {
        if (!product.sizes) return false;
        
        try {
          let productSizes = [];
          
          if (typeof product.sizes === 'string') {
            try {
              productSizes = JSON.parse(product.sizes);
            } catch (jsonError) {
              productSizes = product.sizes.split(',').map(size => size.trim());
            }
          } else if (Array.isArray(product.sizes)) {
            productSizes = product.sizes;
          }
          
          return requestedSizes.some(requestedSize => 
            productSizes.some(productSize => 
              productSize.toString().trim() === requestedSize
            )
          );
          
        } catch (parseError) {
          return false;
        }
      });
    }
    
    res.json(filteredData);
  } catch (err) {
    res.status(500).json({ error: 'Internal server error' });
  }
});

app.get('/api/product-images', async (req, res) => {
  try {
    const { data, error } = await supabase
      .from('product_images')
      .select('product_id, image_url');
    
    if (error) {
      return res.status(400).json({ error: error.message });
    }
    
    const imagesMap = {};
    data.forEach(img => {
      imagesMap[img.product_id] = img.image_url;
    });
    
    res.json(imagesMap);
  } catch (err) {
    res.status(500).json({ error: 'Internal server error' });
  }
});

app.get('/api/product-images/:productId', async (req, res) => {
  try {
    const { productId } = req.params;

    const { data, error } = await supabase
      .from('product_images')
      .select('image_url')
      .eq('product_id', productId);

    if (error) {
      return res.status(400).json({ error: error.message });
    }

    if (!data || data.length === 0) {
      return res.json([]);
    }

    const imageUrls = data.map(item => item.image_url);
    res.json(imageUrls);
  } catch (err) {
    res.status(500).json({ error: 'Internal server error' });
  }
});

app.get('/api/offer-images', async (req, res) => {
  try {
    const { data, error } = await supabase
      .from('offer_images')
      .select('id, image_url, alt_text, created_at')
      .order('created_at', { ascending: false });
    
    if (error) {
      return res.status(400).json({ error: error.message });
    }
    res.json(data);
  } catch (err) {
    res.status(500).json({ error: 'Internal server error' });
  }
});

app.get('/api/filters/options', async (req, res) => {
  try {
    const { data, error } = await supabase
      .from('products')
      .select('brand, gender, type');
    
    if (error) {
      return res.status(400).json({ error: error.message });
    }
    
    const brandCount = {};
    const genderCount = {};
    const typeCount = {};

    data.forEach(item => {
      if (item.brand) {
        brandCount[item.brand] = (brandCount[item.brand] || 0) + 1;
      }
      if (item.gender) {
        genderCount[item.gender] = (genderCount[item.gender] || 0) + 1;
      }
      if (item.type) {
        typeCount[item.type] = (typeCount[item.type] || 0) + 1;
      }
    });

    const combinedOptions = [
      ...Object.entries(genderCount).map(([name, count]) => ({ 
        name, 
        count, 
        category: 'genders',
        displayCategory: 'სქესი'
      })),
      ...Object.entries(typeCount).map(([name, count]) => ({ 
        name, 
        count, 
        category: 'types',
        displayCategory: 'ტიპი'
      })),
      ...Object.entries(brandCount).map(([name, count]) => ({ 
        name, 
        count, 
        category: 'brands',
        displayCategory: 'ბრენდი'
      }))
    ];

    res.json({
      success: true,
      data: combinedOptions
    });
    
  } catch (err) {
    res.status(500).json({ error: 'Internal server error' });
  }
});

app.post('/api/auth/signup', async (req, res) => {
  try {
    const { email, password, firstName, lastName, phoneNumber, gender, dateOfBirth } = req.body;

    if (!email || !password || !firstName || !lastName || !gender || !dateOfBirth) {
      return res.status(400).json({ 
        error: 'ყველა სავალდებულო ველი უნდა იყოს შევსებული' 
      });
    }

    const { data: authData, error: authError } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: {
          first_name: firstName,
          last_name: lastName,
          phone_number: phoneNumber || null,
          gender: gender,
          date_of_birth: dateOfBirth,
        }
      }
    });

    if (authError) {
      return res.status(400).json({ error: authError.message });
    }

    if (authData.user && !authData.session) {
      return res.status(201).json({
        success: true,
        message: 'რეგისტრაცია წარმატებული! გთხოვთ შეამოწმოთ თქვენი ელ-ფოსტა დასადასტურებლად.',
        user: {
          id: authData.user.id,
          email: authData.user.email,
          email_confirmed: authData.user.email_confirmed_at !== null
        }
      });
    }

    if (authData.user && authData.session) {
      return res.status(201).json({
        success: true,
        message: 'რეგისტრაცია წარმატებული!',
        user: {
          id: authData.user.id,
          email: authData.user.email,
          firstName: authData.user.user_metadata.first_name,
          lastName: authData.user.user_metadata.last_name,
          phoneNumber: authData.user.user_metadata.phone_number,
          gender: authData.user.user_metadata.gender,
          dateOfBirth: authData.user.user_metadata.date_of_birth,
        },
        session: authData.session
      });
    }

    return res.status(400).json({ error: 'რეგისტრაცია ვერ მოხერხდა' });

  } catch (err) {
    res.status(500).json({ error: 'სერვერის შეცდომა' });
  }
});

app.post('/api/auth/login', async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ 
        error: 'ელ-ფოსტა და პაროლი სავალდებულოა' 
      });
    }

    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (error) {
      return res.status(400).json({ 
        error: 'არასწორი ელ-ფოსტა ან პაროლი' 
      });
    }

    if (!data.session || !data.user) {
      return res.status(400).json({ error: 'შესვლა ვერ მოხერხდა' });
    }

    res.json({
      success: true,
      user: {
        id: data.user.id,
        email: data.user.email,
        firstName: data.user.user_metadata.first_name || '',
        lastName: data.user.user_metadata.last_name || '',
        phoneNumber: data.user.user_metadata.phone_number || '',
        gender: data.user.user_metadata.gender || '',
        dateOfBirth: data.user.user_metadata.date_of_birth || '',
      },
      session: {
        access_token: data.session.access_token,
        refresh_token: data.session.refresh_token,
        expires_at: data.session.expires_at
      }
    });

  } catch (err) {
    res.status(500).json({ error: 'სერვერის შეცდომა' });
  }
});

app.post('/api/auth/logout', authenticateUser, async (req, res) => {
  try {
    const authHeader = req.headers.authorization;
    const token = authHeader.substring(7);
    
    const { error } = await supabase.auth.admin.signOut(token);

    if (error) {
      console.error('Logout error:', error);
    }

    res.json({ success: true, message: 'წარმატებით გახვედით სისტემიდან' });

  } catch (err) {
    res.json({ success: true, message: 'გასვლა დასრულდა' });
  }
});

app.get('/api/auth/user', authenticateUser, async (req, res) => {
  try {
    const user = req.user;

    res.json({
      id: user.id,
      email: user.email,
      firstName: user.user_metadata?.first_name || user.user_metadata?.given_name || '',
      lastName: user.user_metadata?.last_name || user.user_metadata?.family_name || '',
      phoneNumber: user.user_metadata?.phone_number || '',
      gender: user.user_metadata?.gender || '',
      dateOfBirth: user.user_metadata?.date_of_birth || '',
      avatar: user.user_metadata?.avatar_url || user.user_metadata?.picture || ''
    });

  } catch (err) {
    res.status(500).json({ error: 'სერვერის შეცდომა' });
  }
});

app.get('/api/auth/google', async (req, res) => {
  try {
    const redirectUrl = getRedirectUrl(req, 'google');

    const { data, error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: {
        redirectTo: redirectUrl,
        flowType: 'pkce',
        queryParams: {
          access_type: 'offline',
          prompt: 'consent',
        },
      }
    });

    if (error) {
      return res.status(400).json({ error: error.message });
    }

    if (!data.url) {
      return res.status(400).json({ error: 'OAuth URL not generated' });
    }

    res.redirect(data.url);
    
  } catch (err) {
    res.status(500).json({ error: 'OAuth initiation failed' });
  }
});

app.get('/api/auth/facebook', async (req, res) => {
  try {
    const redirectUrl = getRedirectUrl(req, 'facebook');

    const { data, error } = await supabase.auth.signInWithOAuth({
      provider: 'facebook',
      options: {
        redirectTo: redirectUrl,
        flowType: 'pkce',
        scopes: 'email,public_profile',
        queryParams: {
          response_type: 'code',
          access_type: 'offline'
        }
      }
    });

    if (error) {
      return res.status(400).json({ error: error.message });
    }

    if (!data.url) {
      return res.status(400).json({ error: 'OAuth URL not generated' });
    }

    res.redirect(data.url);
    
  } catch (err) {
    res.status(500).json({ error: 'OAuth initiation failed' });
  }
});

const createSessionData = (data) => ({
  user: {
    id: data.user.id,
    email: data.user.email,
    firstName: data.user.user_metadata?.first_name || data.user.user_metadata?.given_name || '',
    lastName: data.user.user_metadata?.last_name || data.user.user_metadata?.family_name || '',
    phoneNumber: data.user.user_metadata?.phone_number || '',
    gender: data.user.user_metadata?.gender || '',
    dateOfBirth: data.user.user_metadata?.date_of_birth || '',
    avatar: data.user.user_metadata?.avatar_url || data.user.user_metadata?.picture || ''
  },
  session: {
    access_token: data.session.access_token,
    refresh_token: data.session.refresh_token,
    expires_at: data.session.expires_at
  }
});

app.get('/api/auth/callback/google', async (req, res) => {
  const { code, error, error_description } = req.query;

  if (error) {
    return res.redirect(`${FRONTEND_URL}/?error=google_oauth_error&details=${encodeURIComponent(error_description || error)}`);
  }

  if (code) {
    try {
      const { data, error: supabaseError } = await supabase.auth.exchangeCodeForSession(code);

      if (supabaseError) {
        return res.redirect(`${FRONTEND_URL}/?error=session_exchange_failed&details=${encodeURIComponent(supabaseError.message)}`);
      }

      if (!data.session || !data.user) {
        return res.redirect(`${FRONTEND_URL}/?error=incomplete_session_data`);
      }
      
      const sessionData = createSessionData(data);
      const encoded = Buffer.from(JSON.stringify(sessionData)).toString('base64');
      
      return res.redirect(`${FRONTEND_URL}/?auth_success=true&session=${encoded}&provider=google`);
      
    } catch (err) {
      return res.redirect(`${FRONTEND_URL}/?error=callback_exception&details=${encodeURIComponent(err.message)}`);
    }
  }

  if (!code) {
    return res.redirect(`${FRONTEND_URL}/?auth_flow=client_side&provider=google`);
  }

  return res.redirect(`${FRONTEND_URL}/?error=unexpected_flow&provider=google`);
});

app.get('/api/auth/callback/facebook', async (req, res) => {
  const { code, error, error_description } = req.query;

  if (error) {
    return res.redirect(`${FRONTEND_URL}/?error=facebook_oauth_error&details=${encodeURIComponent(error_description || error)}`);
  }

  if (code) {
    try {
      const { data, error: supabaseError } = await supabase.auth.exchangeCodeForSession(code);

      if (supabaseError) {
        return res.redirect(`${FRONTEND_URL}/?error=session_exchange_failed&details=${encodeURIComponent(supabaseError.message)}`);
      }

      if (!data.session || !data.user) {
        return res.redirect(`${FRONTEND_URL}/?error=incomplete_session_data`);
      }
      
      const sessionData = createSessionData(data);
      const encoded = Buffer.from(JSON.stringify(sessionData)).toString('base64');
      
      return res.redirect(`${FRONTEND_URL}/?auth_success=true&session=${encoded}&provider=facebook`);
      
    } catch (err) {
      return res.redirect(`${FRONTEND_URL}/?error=callback_exception&details=${encodeURIComponent(err.message)}`);
    }
  }

  if (!code) {
    return res.redirect(`${FRONTEND_URL}/?auth_flow=client_side&provider=facebook`);
  }

  return res.redirect(`${FRONTEND_URL}/?error=unexpected_flow&provider=facebook`);
});

app.get('/reset-password', (req, res) => {
  try {
    const { 
      access_token, 
      expires_in, 
      refresh_token, 
      token_type, 
      type,
      error,
      error_description 
    } = req.query;

    if (error) {
      return res.redirect(`${FRONTEND_URL}/?error=${encodeURIComponent(error)}&message=${encodeURIComponent(error_description || '')}`);
    }

    if (access_token && type === 'recovery') {
      const frontendUrl = new URL(`${FRONTEND_URL}/update-password`);
      frontendUrl.searchParams.set('access_token', access_token);
      frontendUrl.searchParams.set('refresh_token', refresh_token || '');
      frontendUrl.searchParams.set('expires_in', expires_in || '3600');
      frontendUrl.searchParams.set('token_type', token_type || 'bearer');
      frontendUrl.searchParams.set('type', type);

      return res.redirect(frontendUrl.toString());
    }
    
    const html = `
    <!DOCTYPE html>
    <html>
    <head>
        <title>Password Reset</title>
        <style>
            body { 
                font-family: Arial, sans-serif; 
                display: flex; 
                justify-content: center; 
                align-items: center; 
                height: 100vh; 
                margin: 0;
                background-color: #f5f5f5;
            }
            .container { 
                text-align: center; 
                background: white;
                padding: 2rem;
                border-radius: 8px;
                box-shadow: 0 2px 10px rgba(0,0,0,0.1);
            }
            .spinner { 
                width: 40px; 
                height: 40px; 
                border: 4px solid #f3f3f3; 
                border-top: 4px solid #3498db; 
                border-radius: 50%; 
                animation: spin 1s linear infinite; 
                margin: 20px auto;
            }
            @keyframes spin { 
                0% { transform: rotate(0deg); } 
                100% { transform: rotate(360deg); } 
            }
            .error {
                color: #e74c3c;
                margin-top: 1rem;
            }
        </style>
    </head>
    <body>
        <div class="container">
            <h2>პაროლის აღდგენა</h2>
            <div class="spinner"></div>
            <p>მიმდინარეობს გადამისამართება...</p>
            <div id="error" class="error" style="display: none;"></div>
        </div>

        <script>
            const FRONTEND_URL = '${FRONTEND_URL}';
            
            function handlePasswordReset() {
                try {
                    if (window.location.hash) {
                        const hashParams = new URLSearchParams(window.location.hash.slice(1));
                        
                        const access_token = hashParams.get('access_token');
                        const expires_in = hashParams.get('expires_in');
                        const refresh_token = hashParams.get('refresh_token');
                        const token_type = hashParams.get('token_type');
                        const type = hashParams.get('type');
                        const error = hashParams.get('error');
                        const error_description = hashParams.get('error_description');

                        if (error) {
                            window.location.href = FRONTEND_URL + '/?error=' + encodeURIComponent(error);
                            return;
                        }

                        if (access_token && type === 'recovery') {
                            const frontendUrl = new URL('/update-password', FRONTEND_URL);
                            frontendUrl.searchParams.set('access_token', access_token);
                            frontendUrl.searchParams.set('refresh_token', refresh_token || '');
                            frontendUrl.searchParams.set('expires_in', expires_in || '3600');
                            frontendUrl.searchParams.set('token_type', token_type || 'bearer');
                            frontendUrl.searchParams.set('type', type);
                            
                            window.location.href = frontendUrl.toString();
                            return;
                        }
                    }

                    const urlParams = new URLSearchParams(window.location.search);
                    const access_token = urlParams.get('access_token');
                    const type = urlParams.get('type');
                    const error = urlParams.get('error');

                    if (error) {
                        window.location.href = FRONTEND_URL + '/?error=' + encodeURIComponent(error);
                        return;
                    }

                    if (access_token && type === 'recovery') {
                        window.location.href = FRONTEND_URL + '/update-password' + window.location.search;
                        return;
                    }

                    document.getElementById('error').style.display = 'block';
                    document.getElementById('error').textContent = 'არასწორი ან ვადაგასული ლინკი';
                    
                    setTimeout(() => {
                        window.location.href = FRONTEND_URL + '/?error=invalid_reset_link';
                    }, 3000);

                } catch (err) {
                    document.getElementById('error').style.display = 'block';
                    document.getElementById('error').textContent = 'შეცდომა: ' + err.message;
                    
                    setTimeout(() => {
                        window.location.href = FRONTEND_URL + '/?error=processing_error';
                    }, 3000);
                }
            }

            handlePasswordReset();
            setTimeout(handlePasswordReset, 500);
        </script>
    </body>
    </html>`;

    res.send(html);
    
  } catch (err) {
    res.redirect(`${FRONTEND_URL}/?error=server_error`);
  }
});

app.post('/api/auth/update-password', async (req, res) => {
  try {
    const { access_token, new_password } = req.body;

    if (!access_token || !new_password) {
      return res.status(400).json({ 
        error: 'ტოკენი და ახალი პაროლი სავალდებულოა' 
      });
    }

    if (new_password.length < 6) {
      return res.status(400).json({ 
        error: 'პაროლი უნდა იყოს მინიმუმ 6 სიმბოლო' 
      });
    }

    const response = await fetch(`${process.env.SUPABASE_URL}/auth/v1/user`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${access_token}`,
        'apikey': process.env.SUPABASE_ANON_KEY || SUPABASE_ANON_KEY
      },
      body: JSON.stringify({
        password: new_password
      })
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      
      return res.status(response.status).json({ 
        error: 'პაროლის განახლება ვერ მოხერხდა: ' + (
          errorData.msg || 
          errorData.error || 
          errorData.message || 
          `HTTP ${response.status}: ${response.statusText}`
        )
      });
    }

    res.json({ 
      success: true, 
      message: 'პაროლი წარმატებით განახლდა! გთხოვთ შეხვიდეთ ახალი პაროლით' 
    });

  } catch (err) {
    res.status(500).json({ 
      error: 'სერვერის შეცდომა: ' + err.message 
    });
  }
});

app.post('/api/auth/exchange-reset-code', async (req, res) => {
  try {
    const { code } = req.body;
    
    if (!code) {
      return res.status(400).json({ error: 'Authorization code is required' });
    }

    const { data, error } = await supabase.auth.exchangeCodeForSession(code);

    if (error) {
      return res.status(400).json({ error: error.message });
    }

    if (!data.session) {
      return res.status(400).json({ error: 'No session received' });
    }

    res.json({
      access_token: data.session.access_token,
      refresh_token: data.session.refresh_token,
      expires_at: data.session.expires_at,
      user: data.user
    });

  } catch (err) {
    res.status(500).json({ error: 'Server error' });
  }
});

app.get('/api/products/:id', async (req, res) => {
  try {
    const { id } = req.params;
    
    const { data, error } = await supabase
      .from('products')
      .select('*')
      .eq('id', id)
      .single();
    
    if (error) {
      if (error.code === 'PGRST116') {
        return res.status(404).json({ error: 'Product not found' });
      }
      return res.status(400).json({ error: error.message });
    }
    
    res.json(data);
  } catch (err) {
    res.status(500).json({ error: 'Internal server error' });
  }
});

app.get('/api/products/:productId/reviews', async (req, res) => {
  try {
    const { productId } = req.params;
    
    const { data, error } = await supabase
      .from('reviews')
      .select('*')
      .eq('product_id', productId)
      .order('created_at', { ascending: false });

    if (error) {
      return res.status(400).json({ error: error.message });
    }

    const reviewsWithUserData = await Promise.all(
      data.map(async (review) => {
        try {
          const { data: userData, error: userError } = await supabaseAdmin.auth.admin.getUserById(review.profile_id);
          
          if (userError) {
            return {
              ...review,
              profiles: {
                first_name: 'Unknown',
                last_name: 'User'
              }
            };
          }

          const userMetadata = userData?.user?.user_metadata || {};
          
          return {
            ...review,
            profiles: {
              first_name: userMetadata.first_name || userMetadata.given_name || 'Unknown',
              last_name: userMetadata.last_name || userMetadata.family_name || 'User'
            }
          };
        } catch (fetchError) {
          return {
            ...review,
            profiles: {
              first_name: 'Unknown',
              last_name: 'User'
            }
          };
        }
      })
    );

    res.json(reviewsWithUserData);
  } catch (err) {
    res.status(500).json({ error: 'Internal server error' });
  }
});

app.post('/api/reviews', authenticateUser, async (req, res) => {
  try {
    const { product_id, review_text, star_count } = req.body;
    const user = req.user;

    const authHeader = req.headers.authorization;
    const token = authHeader.substring(7);
    
    const userSupabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
      global: {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      },
    });

    if (!product_id || !review_text || !star_count) {
      return res.status(400).json({ 
        error: 'პროდუქტი, კომენტარი და შეფასება სავალდებულოა' 
      });
    }

    if (star_count < 1 || star_count > 5) {
      return res.status(400).json({ 
        error: 'შეფასება უნდა იყოს 1-დან 5-მდე' 
      });
    }

    const firstName = user.user_metadata?.first_name || user.user_metadata?.given_name;
    const lastName = user.user_metadata?.last_name || user.user_metadata?.family_name;

    if (!firstName || !lastName) {
      return res.status(400).json({ 
        error: 'თქვენი პროფილი არ არის დასრულებული. გთხოვთ, შეავსოთ სახელი და გვარი',
        code: 'PROFILE_INCOMPLETE',
        requiresLogin: false,
        requiresProfileUpdate: true,
        currentProfile: {
          firstName: firstName || '',
          lastName: lastName || '',
          email: user.email
        }
      });
    }

    const { data: existingProfile, error: profileCheckError } = await supabaseAdmin
      .from('profiles')
      .select('id')
      .eq('id', user.id)
      .single();

    if (profileCheckError && profileCheckError.code === 'PGRST116') {
      const { error: profileCreateError } = await supabaseAdmin
        .from('profiles')
        .insert([{
          id: user.id,
          email: user.email,
          first_name: firstName,
          last_name: lastName,
          phone_number: user.user_metadata?.phone_number || null,
          gender: user.user_metadata?.gender || null,
          date_of_birth: user.user_metadata?.date_of_birth || null,
          avatar_url: user.user_metadata?.avatar_url || user.user_metadata?.picture || '',
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        }]);

      if (profileCreateError) {
        return res.status(400).json({ error: 'პროფილის შექმნა ვერ მოხერხდა' });
      }
    }

    const { data: existingReview } = await userSupabase
      .from('reviews')
      .select('id')
      .eq('profile_id', user.id)
      .eq('product_id', product_id)
      .single();

    if (existingReview) {
      return res.status(400).json({ 
        error: 'თქვენ უკვე გაქვთ შეფასება ამ პროდუქტზე' 
      });
    }

    const { data, error } = await userSupabase
      .from('reviews')
      .insert([{
        profile_id: user.id,
        product_id: product_id,
        review_text: review_text.trim(),
        star_count: parseInt(star_count),
        created_at: new Date().toISOString()
      }])
      .select()
      .single();

    if (error) {
      return res.status(400).json({ error: error.message });
    }

    res.status(201).json({
      success: true,
      message: 'შეფასება წარმატებით დაემატა',
      review: {
        ...data,
        profiles: {
          first_name: firstName,
          last_name: lastName
        }
      }
    });

  } catch (err) {
    res.status(500).json({ error: 'სერვერის შეცდომა' });
  }
});

app.post('/api/reviews/:reviewId/helpful', authenticateUser, async (req, res) => {
  try {
    const { reviewId } = req.params;
    const user = req.user;

    const authHeader = req.headers.authorization;
    const token = authHeader.substring(7);
    
    const userSupabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
      global: {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      },
    });

    const { data: review, error: reviewError } = await userSupabase
      .from('reviews')
      .select('id, helpful_count, profile_id')
      .eq('id', reviewId)
      .single();

    if (reviewError || !review) {
      return res.status(404).json({ error: 'შეფასება ვერ მოიძებნა' });
    }

    if (review.profile_id === user.id) {
      return res.status(400).json({ error: 'თქვენ ვერ შეფასებთ საკუთარ კომენტარს' });
    }

    const { data: existingVote, error: voteCheckError } = await userSupabase
      .from('review_helpful_votes')
      .select('id')
      .eq('review_id', reviewId)
      .eq('user_id', user.id)
      .maybeSingle();

    if (voteCheckError && voteCheckError.code !== 'PGRST116') {
      return res.status(400).json({ error: 'ხმის შემოწმება ვერ მოხერხდა' });
    }

    if (existingVote) {
      const { error: deleteVoteError } = await userSupabase
        .from('review_helpful_votes')
        .delete()
        .eq('review_id', reviewId)
        .eq('user_id', user.id);

      if (deleteVoteError) {
        return res.status(400).json({ error: 'ხმის გაუქმება ვერ მოხერხდა' });
      }

      const newHelpfulCount = Math.max(0, (review.helpful_count || 0) - 1);
      
      const { data: updatedReview, error: updateError } = await userSupabase
        .from('reviews')
        .update({ helpful_count: newHelpfulCount })
        .eq('id', reviewId)
        .select('helpful_count')
        .single();

      if (updateError) {
        return res.status(400).json({ error: 'შეფასების განახლება ვერ მოხერხდა' });
      }

      return res.json({
        success: true,
        action: 'removed',
        message: 'ხმა გაუქმდა',
        helpful_count: updatedReview.helpful_count,
        user_voted: false
      });
    } else {
      const { error: insertVoteError } = await userSupabase
        .from('review_helpful_votes')
        .insert({
          review_id: reviewId,
          user_id: user.id
        });

      if (insertVoteError) {
        if (insertVoteError.code === '23505') {
          return res.status(400).json({ error: 'თქვენ უკვე შეაფასეთ ეს კომენტარი' });
        }
        
        return res.status(400).json({ error: 'ხმის რეგისტრაცია ვერ მოხერხდა' });
      }

      const newHelpfulCount = (review.helpful_count || 0) + 1;
      
      const { data: updatedReview, error: updateError } = await userSupabase
        .from('reviews')
        .update({ helpful_count: newHelpfulCount })
        .eq('id', reviewId)
        .select('helpful_count')
        .single();

      if (updateError) {
        await userSupabase
          .from('review_helpful_votes')
          .delete()
          .eq('review_id', reviewId)
          .eq('user_id', user.id);
        
        return res.status(400).json({ error: 'შეფასების განახლება ვერ მოხერხდა' });
      }

      return res.json({
        success: true,
        action: 'added',
        helpful_count: updatedReview.helpful_count,
        user_voted: true
      });
    }

  } catch (err) {
    res.status(500).json({ error: 'სერვერის შეცდომა' });
  }
});

app.get('/api/products/:productId/user-votes', authenticateUser, async (req, res) => {
  try {
    const { productId } = req.params;
    const user = req.user;

    const authHeader = req.headers.authorization;
    const token = authHeader.substring(7);
    
    const userSupabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
      global: {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      },
    });

    const { data: userVotes, error } = await userSupabase
      .from('review_helpful_votes')
      .select(`
        review_id,
        created_at,
        reviews!inner(product_id)
      `)
      .eq('user_id', user.id)
      .eq('reviews.product_id', productId);

    if (error) {
      return res.status(400).json({ error: 'ხმების მოძიება ვერ მოხერხდა' });
    }

    const votes = {};
    userVotes.forEach(vote => {
      votes[vote.review_id] = true;
    });

    res.json({
      success: true,
      votes: votes
    });

  } catch (err) {
    res.status(500).json({ error: 'სერვერის შეცდომა' });
  }
});

app.use(express.static(path.join(__dirname, '../client/dist')));

app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, '../client/dist/index.html'));
});

app.listen(PORT, () => {
  console.log(`Server running at http://localhost:${PORT}`);
});