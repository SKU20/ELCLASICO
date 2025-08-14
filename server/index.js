import express from 'express';
import path from 'path';
import cors from 'cors';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';
import { createClient } from '@supabase/supabase-js';

// Load environment variables first
dotenv.config();

const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_ANON_KEY = process.env.SUPABASE_ANON_KEY;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

// ADD THESE NEW ENVIRONMENT VARIABLES:
const FRONTEND_URL = process.env.FRONTEND_URL || 'http://localhost:3000';
const BACKEND_URL = process.env.BACKEND_URL || 'http://localhost:3000';
const NODE_ENV = process.env.NODE_ENV || 'development';

// Log environment info for debugging
console.log('Environment Configuration:', {
  NODE_ENV: NODE_ENV,
  FRONTEND_URL: FRONTEND_URL,
  BACKEND_URL: BACKEND_URL,
  SUPABASE_URL: SUPABASE_URL ? 'SET' : 'NOT SET',
  SUPABASE_ANON_KEY: SUPABASE_ANON_KEY ? 'SET' : 'NOT SET',
  SUPABASE_SERVICE_ROLE_KEY: SUPABASE_SERVICE_ROLE_KEY ? 'SET' : 'NOT SET'
});

if (!SUPABASE_URL || !SUPABASE_ANON_KEY || !SUPABASE_SERVICE_ROLE_KEY) {
  console.error('Missing Supabase environment variables. Please check your .env file.');
  process.exit(1);
}

// Regular client (for public operations)
const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

// Admin client (bypasses RLS)
const supabaseAdmin = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

// Helper function to get the correct redirect URL
const getRedirectUrl = (req, provider) => {
  // Use environment variable if available, otherwise construct from request
  if (NODE_ENV === 'production' && BACKEND_URL !== 'http://localhost:3000') {
    return `${BACKEND_URL}/api/auth/callback/${provider}`;
  }
  
  // For development or fallback
  return `${req.protocol}://${req.get('host')}/api/auth/callback/${provider}`;
};

// ES6 module equivalent of __dirname
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load environment variables
dotenv.config();

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(cors());
app.use(express.json());

// Helper function to authenticate user from token
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

// API Routes
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
    
    // Parse and collect all unique sizes
    const allSizes = new Set();
    
    data.forEach(product => {
      if (product.sizes) {
        try {
          let parsedSizes = [];
          
          // Handle different formats
          if (typeof product.sizes === 'string') {
            try {
              parsedSizes = JSON.parse(product.sizes);
            } catch (jsonError) {
              // If JSON parsing fails, treat as comma-separated string
              parsedSizes = product.sizes.split(',').map(size => size.trim());
            }
          } else if (Array.isArray(product.sizes)) {
            parsedSizes = product.sizes;
          }
          
          // Add each size to the set
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
    
    // Convert to array and sort numerically
    const sortedSizes = Array.from(allSizes).sort((a, b) => {
      const numA = parseFloat(a);
      const numB = parseFloat(b);
      
      // If both are valid numbers, sort numerically
      if (!isNaN(numA) && !isNaN(numB)) {
        return numA - numB;
      }
      
      // If one or both are not numbers, sort alphabetically
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

// Update the existing filter endpoint to support size filtering
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
    
    // Get all products first, then filter by sizes if needed
    const { data, error } = await query;
    
    if (error) {
      return res.status(400).json({ error: error.message });
    }
    
    // Filter by sizes if specified
    let filteredData = data;
    if (sizes) {
      const requestedSizes = sizes.split(',').map(s => s.trim());
      
      filteredData = data.filter(product => {
        if (!product.sizes) return false;
        
        try {
          let productSizes = [];
          
          // Parse product sizes
          if (typeof product.sizes === 'string') {
            try {
              productSizes = JSON.parse(product.sizes);
            } catch (jsonError) {
              productSizes = product.sizes.split(',').map(size => size.trim());
            }
          } else if (Array.isArray(product.sizes)) {
            productSizes = product.sizes;
          }
          
          // Check if any requested size matches any product size
          return requestedSizes.some(requestedSize => 
            productSizes.some(productSize => 
              productSize.toString().trim() === requestedSize
            )
          );
          
        } catch (parseError) {
          console.error('Error parsing product sizes for filtering:', parseError);
          return false;
        }
      });
    }
    
    res.json(filteredData);
  } catch (err) {
    console.error('Filter products error:', err);
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
    
    // Transform data into a map for easier frontend usage
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

    // Use `select('*')` to get all images for the product
    const { data, error } = await supabase
      .from('product_images')
      .select('image_url')
      .eq('product_id', productId);

    if (error) {
      console.error('Supabase error:', error);
      return res.status(400).json({ error: error.message });
    }

    // If no images are found, return an empty array
    if (!data || data.length === 0) {
      return res.json([]);
    }

    // Return the array of image URLs
    const imageUrls = data.map(item => item.image_url);
    res.json(imageUrls);
  } catch (err) {
    console.error('Server error:', err);
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
      console.error('Supabase error:', error);
      return res.status(400).json({ error: error.message });
    }
    res.json(data);
  } catch (err) {
    console.error('Server error:', err);
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
    
    // Process the data to get counts for each filter option
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

    // Combine all filter options into one array with category info
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
    console.error('Server error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Authentication Routes

// Sign up endpoint
app.post('/api/auth/signup', async (req, res) => {
  try {
    const { email, password, firstName, lastName, phoneNumber, gender, dateOfBirth } = req.body;

    // Validate required fields
    if (!email || !password || !firstName || !lastName || !gender || !dateOfBirth) {
      return res.status(400).json({ 
        error: 'ყველა სავალდებულო ველი უნდა იყოს შევსებული' 
      });
    }

    // Sign up user with Supabase Auth
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
      console.error('Auth error:', authError);
      return res.status(400).json({ error: authError.message });
    }

    // If user was created successfully but needs email confirmation
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

    // If user was created and auto-confirmed
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
    console.error('Signup error:', err);
    res.status(500).json({ error: 'სერვერის შეცდომა' });
  }
});

// Login endpoint
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
      console.error('Login error:', error);
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
    console.error('Login error:', err);
    res.status(500).json({ error: 'სერვერის შეცდომა' });
  }
});

// Logout endpoint
app.post('/api/auth/logout', authenticateUser, async (req, res) => {
  try {
    const authHeader = req.headers.authorization;
    const token = authHeader.substring(7);
    
    const { error } = await supabase.auth.admin.signOut(token);

    if (error) {
      console.error('Logout error:', error);
      // Don't return error, as the token might already be invalid
    }

    res.json({ success: true, message: 'წარმატებით გახვედით სისტემიდან' });

  } catch (err) {
    console.error('Logout error:', err);
    // Still return success as the client should clear local storage anyway
    res.json({ success: true, message: 'გასვლა დასრულდა' });
  }
});

// Get current user endpoint
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
    console.error('Get user error:', err);
    res.status(500).json({ error: 'სერვერის შეცდომა' });
  }
});

// Google OAuth initiation route - Updated
app.get('/api/auth/google', async (req, res) => {
  try {
    console.log('=== Initiating Google OAuth ===');
    console.log('Environment:', process.env.NODE_ENV);
    console.log('Backend URL:', BACKEND_URL);
    
    const redirectUrl = getRedirectUrl(req, 'google');
    console.log('Using redirect URL:', redirectUrl);

    const { data, error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: {
        redirectTo: redirectUrl,
        // Force server-side flow
        flowType: 'pkce',
        queryParams: {
          access_type: 'offline',
          prompt: 'consent',
        },
      }
    });

    console.log('Google OAuth initiation result:', { data, error });

    if (error) {
      console.error('Google OAuth initiation error:', error);
      return res.status(400).json({ error: error.message });
    }

    if (!data.url) {
      console.error('No OAuth URL received from Supabase');
      return res.status(400).json({ error: 'OAuth URL not generated' });
    }

    console.log('Redirecting to Google OAuth URL:', data.url);
    res.redirect(data.url);
    
  } catch (err) {
    console.error('Google OAuth route error:', err);
    res.status(500).json({ error: 'OAuth initiation failed' });
  }
});

// Facebook OAuth route - Updated
app.get('/api/auth/facebook', async (req, res) => {
  console.log('=== Initiating Facebook OAuth ===');
  console.log('Environment:', process.env.NODE_ENV);
  
  try {
    const redirectUrl = getRedirectUrl(req, 'facebook');
    console.log('Using redirect URL:', redirectUrl);

    const { data, error } = await supabase.auth.signInWithOAuth({
      provider: 'facebook',
      options: {
        redirectTo: redirectUrl,
        // Force server-side flow with explicit parameters
        flowType: 'pkce',
        scopes: 'email,public_profile',
        queryParams: {
          response_type: 'code', // Explicitly request code flow
          access_type: 'offline'
        }
      }
    });

    console.log('Facebook OAuth initiation result:', { data, error });

    if (error) {
      console.error('Facebook OAuth initiation error:', error);
      return res.status(400).json({ error: error.message });
    }

    if (!data.url) {
      console.error('No OAuth URL received from Supabase');
      return res.status(400).json({ error: 'OAuth URL not generated' });
    }

    console.log('Redirecting to Facebook OAuth URL:', data.url);
    res.redirect(data.url);
    
  } catch (err) {
    console.error('Facebook OAuth route error:', err);
    res.status(500).json({ error: 'OAuth initiation failed' });
  }
});

// Google OAuth callback - Updated with better error handling
app.get('/api/auth/callback/google', async (req, res) => {
  console.log('=== Google OAuth Callback ===');
  console.log('Query params:', req.query);
  console.log('Full URL:', req.url);
  console.log('Frontend URL:', FRONTEND_URL);
  
  const { code, error, error_description } = req.query;

  if (error) {
    console.error('OAuth error from Google:', error, error_description);
    return res.redirect(`${FRONTEND_URL}/?error=google_oauth_error&details=${encodeURIComponent(error_description || error)}`);
  }

  // Handle server-side flow (with authorization code)
  if (code) {
    try {
      console.log('Processing server-side flow with authorization code...');
      const { data, error: supabaseError } = await supabase.auth.exchangeCodeForSession(code);

      if (supabaseError) {
        console.error('Supabase session exchange error:', supabaseError);
        return res.redirect(`${FRONTEND_URL}/?error=session_exchange_failed&details=${encodeURIComponent(supabaseError.message)}`);
      }

      if (!data.session || !data.user) {
        console.error('No session or user data received');
        return res.redirect(`${FRONTEND_URL}/?error=incomplete_session_data`);
      }

      console.log('Session exchange successful');
      
      const sessionData = createSessionData(data);
      const encoded = Buffer.from(JSON.stringify(sessionData)).toString('base64');
      
      return res.redirect(`${FRONTEND_URL}/?auth_success=true&session=${encoded}&provider=google`);
      
    } catch (err) {
      console.error('Google callback error:', err);
      return res.redirect(`${FRONTEND_URL}/?error=callback_exception&details=${encodeURIComponent(err.message)}`);
    }
  }

  // Handle client-side flow (redirect to frontend to process fragment)
  if (!code) {
    console.log('No code, redirecting to frontend to handle fragment');
    return res.redirect(`${FRONTEND_URL}/?auth_flow=client_side&provider=google`);
  }

  // If we have tokens directly (shouldn't happen in server flow, but just in case)
  console.log('Unexpected token parameters in server callback');
  return res.redirect(`${FRONTEND_URL}/?error=unexpected_flow&provider=google`);
});

// Facebook OAuth callback - Updated with better error handling
app.get('/api/auth/callback/facebook', async (req, res) => {
  console.log('=== Facebook OAuth Callback ===');
  console.log('Query params:', req.query);
  console.log('Full URL:', req.url);
  console.log('Frontend URL:', FRONTEND_URL);
  
  const { code, error, error_description } = req.query;

  if (error) {
    console.error('OAuth error from Facebook:', error, error_description);
    return res.redirect(`${FRONTEND_URL}/?error=facebook_oauth_error&details=${encodeURIComponent(error_description || error)}`);
  }

  // Handle server-side flow (with authorization code)
  if (code) {
    try {
      console.log('Processing server-side Facebook flow with authorization code...');
      const { data, error: supabaseError } = await supabase.auth.exchangeCodeForSession(code);

      if (supabaseError) {
        console.error('Supabase session exchange error:', supabaseError);
        return res.redirect(`${FRONTEND_URL}/?error=session_exchange_failed&details=${encodeURIComponent(supabaseError.message)}`);
      }

      if (!data.session || !data.user) {
        console.error('No session or user data received');
        return res.redirect(`${FRONTEND_URL}/?error=incomplete_session_data`);
      }

      console.log('Facebook session exchange successful');
      
      const sessionData = createSessionData(data);
      const encoded = Buffer.from(JSON.stringify(sessionData)).toString('base64');
      
      return res.redirect(`${FRONTEND_URL}/?auth_success=true&session=${encoded}&provider=facebook`);
      
    } catch (err) {
      console.error('Facebook callback error:', err);
      return res.redirect(`${FRONTEND_URL}/?error=callback_exception&details=${encodeURIComponent(err.message)}`);
    }
  }

  // Handle client-side flow (redirect to frontend to process fragment)
  if (!code) {
    console.log('No code for Facebook, redirecting to frontend to handle fragment');
    return res.redirect(`${FRONTEND_URL}/?auth_flow=client_side&provider=facebook`);
  }

  // If we have tokens directly (shouldn't happen in server flow, but just in case)
  console.log('Unexpected token parameters in Facebook server callback');
  return res.redirect(`${FRONTEND_URL}/?error=unexpected_flow&provider=facebook`);
});

// Updated password reset redirect
app.get('/reset-password', (req, res) => {
  try {
    console.log('=== Supabase Password Reset Redirect ===');
    console.log('Query params:', req.query);
    console.log('Frontend URL:', FRONTEND_URL);

    const { 
      access_token, 
      expires_in, 
      refresh_token, 
      token_type, 
      type,
      error,
      error_description 
    } = req.query;

    // Handle errors from Supabase
    if (error) {
      console.error('Supabase password reset error:', error, error_description);
      return res.redirect(`${FRONTEND_URL}/?error=${encodeURIComponent(error)}&message=${encodeURIComponent(error_description || '')}`);
    }

    // Check if we have tokens in query params (server-side flow)
    if (access_token && type === 'recovery') {
      console.log('Found password reset tokens in query params');
      const frontendUrl = new URL(`${FRONTEND_URL}/update-password`);
      frontendUrl.searchParams.set('access_token', access_token);
      frontendUrl.searchParams.set('refresh_token', refresh_token || '');
      frontendUrl.searchParams.set('expires_in', expires_in || '3600');
      frontendUrl.searchParams.set('token_type', token_type || 'bearer');
      frontendUrl.searchParams.set('type', type);

      console.log('Redirecting to frontend with query tokens:', frontendUrl.toString());
      return res.redirect(frontendUrl.toString());
    }

    // If no tokens in query params, send an HTML page that can handle fragment-based tokens
    console.log('No tokens in query params, serving HTML page to handle fragments');
    
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
            
            console.log('Password reset handler loaded');
            console.log('Current URL:', window.location.href);
            console.log('Frontend URL:', FRONTEND_URL);

            function handlePasswordReset() {
                try {
                    // Check URL hash for tokens (most common case)
                    if (window.location.hash) {
                        console.log('Processing hash-based tokens...');
                        const hashParams = new URLSearchParams(window.location.hash.slice(1));
                        
                        const access_token = hashParams.get('access_token');
                        const expires_in = hashParams.get('expires_in');
                        const refresh_token = hashParams.get('refresh_token');
                        const token_type = hashParams.get('token_type');
                        const type = hashParams.get('type');
                        const error = hashParams.get('error');
                        const error_description = hashParams.get('error_description');

                        if (error) {
                            console.error('Error in hash:', error, error_description);
                            window.location.href = FRONTEND_URL + '/?error=' + encodeURIComponent(error);
                            return;
                        }

                        if (access_token && type === 'recovery') {
                            console.log('Valid recovery tokens found in hash, redirecting...');
                            const frontendUrl = new URL('/update-password', FRONTEND_URL);
                            frontendUrl.searchParams.set('access_token', access_token);
                            frontendUrl.searchParams.set('refresh_token', refresh_token || '');
                            frontendUrl.searchParams.set('expires_in', expires_in || '3600');
                            frontendUrl.searchParams.set('token_type', token_type || 'bearer');
                            frontendUrl.searchParams.set('type', type);
                            
                            console.log('Redirecting to:', frontendUrl.toString());
                            window.location.href = frontendUrl.toString();
                            return;
                        }
                    }

                    // Check query parameters as fallback
                    const urlParams = new URLSearchParams(window.location.search);
                    const access_token = urlParams.get('access_token');
                    const type = urlParams.get('type');
                    const error = urlParams.get('error');

                    if (error) {
                        console.error('Error in query params:', error);
                        window.location.href = FRONTEND_URL + '/?error=' + encodeURIComponent(error);
                        return;
                    }

                    if (access_token && type === 'recovery') {
                        console.log('Valid recovery tokens found in query params, redirecting...');
                        window.location.href = FRONTEND_URL + '/update-password' + window.location.search;
                        return;
                    }

                    // No valid tokens found
                    console.error('No valid password reset tokens found');
                    document.getElementById('error').style.display = 'block';
                    document.getElementById('error').textContent = 'არასწორი ან ვადაგასული ლინკი';
                    
                    setTimeout(() => {
                        window.location.href = FRONTEND_URL + '/?error=invalid_reset_link';
                    }, 3000);

                } catch (err) {
                    console.error('Error processing password reset:', err);
                    document.getElementById('error').style.display = 'block';
                    document.getElementById('error').textContent = 'შეცდომა: ' + err.message;
                    
                    setTimeout(() => {
                        window.location.href = FRONTEND_URL + '/?error=processing_error';
                    }, 3000);
                }
            }

            // Run immediately and also after a short delay
            handlePasswordReset();
            setTimeout(handlePasswordReset, 500);
        </script>
    </body>
    </html>`;

    res.send(html);
    
  } catch (err) {
    console.error('Reset password redirect error:', err);
    res.redirect(`${FRONTEND_URL}/?error=server_error`);
  }
});

app.post('/api/auth/update-password', async (req, res) => {
  try {
    const { access_token, new_password } = req.body;

    console.log('Update password request:', {
      access_token: access_token ? access_token.substring(0, 10) + '...' : 'MISSING',
      new_password: new_password ? '***' : 'MISSING'
    });

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

    console.log('Making direct API call to update password...');

    // Make direct API call to Supabase
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
      console.error('Direct API password update error:', {
        status: response.status,
        statusText: response.statusText,
        error: errorData
      });
      
      return res.status(response.status).json({ 
        error: 'პაროლის განახლება ვერ მოხერხდა: ' + (
          errorData.msg || 
          errorData.error || 
          errorData.message || 
          `HTTP ${response.status}: ${response.statusText}`
        )
      });
    }

    const result = await response.json();
    console.log('Password updated successfully via direct API for user:', result.id);

    res.json({ 
      success: true, 
      message: 'პაროლი წარმატებით განახლდა! გთხოვთ შეხვიდეთ ახალი პაროლით' 
    });

  } catch (err) {
    console.error('Update password error:', err);
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

    console.log('Exchanging password reset code for session...');
    const { data, error } = await supabase.auth.exchangeCodeForSession(code);

    if (error) {
      console.error('Code exchange error:', error);
      return res.status(400).json({ error: error.message });
    }

    if (!data.session) {
      return res.status(400).json({ error: 'No session received' });
    }

    console.log('Password reset session exchange successful');

    // Return the session data
    res.json({
      access_token: data.session.access_token,
      refresh_token: data.session.refresh_token,
      expires_at: data.session.expires_at,
      user: data.user
    });

  } catch (err) {
    console.error('Exchange reset code error:', err);
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
    console.error('Error fetching product by ID:', err);
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

    // Fetch user data for each review
    const reviewsWithUserData = await Promise.all(
      data.map(async (review) => {
        try {
          const { data: userData, error: userError } = await supabaseAdmin.auth.admin.getUserById(review.profile_id);
          
          if (userError) {
            console.error('Error fetching user for review:', userError);
            return {
              ...review,
              profiles: {
                first_name: 'Unknown',
                last_name: 'User'
              }
            };
          }

          // Get user metadata or use fallback
          const userMetadata = userData?.user?.user_metadata || {};
          
          return {
            ...review,
            profiles: {
              first_name: userMetadata.first_name || userMetadata.given_name || 'Unknown',
              last_name: userMetadata.last_name || userMetadata.family_name || 'User'
            }
          };
        } catch (fetchError) {
          console.error('Error in user data fetch:', fetchError);
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
    console.error('Error fetching reviews:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

app.post('/api/reviews', authenticateUser, async (req, res) => {
  try {
    const { product_id, review_text, star_count } = req.body;
    const user = req.user;

    // ✅ Create a Supabase client with the user's token from the request
    const authHeader = req.headers.authorization;
    const token = authHeader.substring(7); // Remove 'Bearer ' prefix
    
    const userSupabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
      global: {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      },
    });

    console.log('Creating review for user:', {
      userId: user.id,
      email: user.email
    });

    // Validate required fields
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

    // Check if user has complete profile
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

    // Check if profile exists in profiles table, create if not
    const { data: existingProfile, error: profileCheckError } = await supabaseAdmin
      .from('profiles')
      .select('id')
      .eq('id', user.id)
      .single();

    if (profileCheckError && profileCheckError.code === 'PGRST116') {
      // Profile doesn't exist, create it
      console.log('Creating profile for user:', user.id);
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
        console.error('Profile creation error:', profileCreateError);
        return res.status(400).json({ error: 'პროფილის შექმნა ვერ მოხერხდა' });
      }
      console.log('Profile created successfully for user:', user.id);
    }

    // Check for existing review
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

    // ✅ Create the review using the user's authenticated client
    const { data, error } = await userSupabase
      .from('reviews')
      .insert([{
        profile_id: user.id,  // This should now work with RLS
        product_id: product_id,
        review_text: review_text.trim(),
        star_count: parseInt(star_count),
        created_at: new Date().toISOString()
      }])
      .select()
      .single();

    if (error) {
      console.error('Review creation error:', error);
      return res.status(400).json({ error: error.message });
    }

    console.log('Review created successfully:', data);

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
    console.error('Create review error:', err);
    res.status(500).json({ error: 'სერვერის შეცდომა' });
  }
});

app.post('/api/reviews/:reviewId/helpful', authenticateUser, async (req, res) => {
  try {
    const { reviewId } = req.params;
    const user = req.user;

    console.log('Processing helpful vote:', { reviewId, userId: user.id });

    // ✅ Create authenticated Supabase client with user's token
    const authHeader = req.headers.authorization;
    const token = authHeader.substring(7); // Remove 'Bearer ' prefix
    
    const userSupabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
      global: {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      },
    });

    // First, check if the review exists
    const { data: review, error: reviewError } = await userSupabase
      .from('reviews')
      .select('id, helpful_count, profile_id')
      .eq('id', reviewId)
      .single();

    if (reviewError || !review) {
      console.error('Review fetch error:', reviewError);
      return res.status(404).json({ error: 'შეფასება ვერ მოიძებნა' });
    }

    // Prevent users from marking their own reviews as helpful
    if (review.profile_id === user.id) {
      return res.status(400).json({ error: 'თქვენ ვერ შეფასებთ საკუთარ კომენტარს' });
    }

    // Check if user has already voted on this review
    const { data: existingVote, error: voteCheckError } = await userSupabase
      .from('review_helpful_votes')
      .select('id')
      .eq('review_id', reviewId)
      .eq('user_id', user.id)
      .maybeSingle(); // Use maybeSingle() instead of single() to avoid error when no rows

    if (voteCheckError && voteCheckError.code !== 'PGRST116') {
      console.error('Vote check error:', voteCheckError);
      return res.status(400).json({ error: 'ხმის შემოწმება ვერ მოხერხდა' });
    }

    if (existingVote) {
      // User has already voted - remove their vote (toggle behavior)
      const { error: deleteVoteError } = await userSupabase
        .from('review_helpful_votes')
        .delete()
        .eq('review_id', reviewId)
        .eq('user_id', user.id);

      if (deleteVoteError) {
        console.error('Vote deletion error:', deleteVoteError);
        return res.status(400).json({ error: 'ხმის გაუქმება ვერ მოხერხდა' });
      }

      // Decrement the helpful count
      const newHelpfulCount = Math.max(0, (review.helpful_count || 0) - 1);
      
      const { data: updatedReview, error: updateError } = await userSupabase
        .from('reviews')
        .update({ helpful_count: newHelpfulCount })
        .eq('id', reviewId)
        .select('helpful_count')
        .single();

      if (updateError) {
        console.error('Review update error:', updateError);
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
      // User hasn't voted yet - add their vote using authenticated client
      const { error: insertVoteError } = await userSupabase
        .from('review_helpful_votes')
        .insert({
          review_id: reviewId,
          user_id: user.id
        });

      if (insertVoteError) {
        console.error('Vote insert error:', insertVoteError);
        
        // Check if it's a duplicate key error (race condition)
        if (insertVoteError.code === '23505') {
          return res.status(400).json({ error: 'თქვენ უკვე შეაფასეთ ეს კომენტარი' });
        }
        
        return res.status(400).json({ error: 'ხმის რეგისტრაცია ვერ მოხერხდა' });
      }

      // Increment the helpful count
      const newHelpfulCount = (review.helpful_count || 0) + 1;
      
      const { data: updatedReview, error: updateError } = await userSupabase
        .from('reviews')
        .update({ helpful_count: newHelpfulCount })
        .eq('id', reviewId)
        .select('helpful_count')
        .single();

      if (updateError) {
        console.error('Review update error:', updateError);
        
        // Rollback the vote if update fails using authenticated client
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
    console.error('Mark helpful error:', err);
    res.status(500).json({ error: 'სერვერის შეცდომა' });
  }
});

// New endpoint to get user's vote status for a product's reviews
// New endpoint to get user's vote status for a product's reviews
app.get('/api/products/:productId/user-votes', authenticateUser, async (req, res) => {
  try {
    const { productId } = req.params;
    const user = req.user;

    console.log('Fetching user votes for product:', { productId, userId: user.id });

    // ✅ Create authenticated Supabase client with user's token
    const authHeader = req.headers.authorization;
    const token = authHeader.substring(7); // Remove 'Bearer ' prefix
    
    const userSupabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
      global: {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      },
    });

    // Get all reviews for this product that the user has voted on
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
      console.error('Error fetching user votes:', error);
      return res.status(400).json({ error: 'ხმების მოძიება ვერ მოხერხდა' });
    }

    // Create a mapping of reviewId -> true for voted reviews
    const votes = {};
    userVotes.forEach(vote => {
      votes[vote.review_id] = true;
    });

    res.json({
      success: true,
      votes: votes
    });

  } catch (err) {
    console.error('Get user votes error:', err);
    res.status(500).json({ error: 'სერვერის შეცდომა' });
  }
});

// Serve static files from React's dist folder
app.use(express.static(path.join(__dirname, '../client/dist')));

// Handle React routing, return all requests to React app
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, '../client/dist/index.html'));
});

app.listen(PORT, () => {
  console.log(`Server running at http://localhost:${PORT}`);
});