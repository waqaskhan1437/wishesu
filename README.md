# 🚀 AUTO DEPLOY - Product API

## ⚡ ONE COMMAND SETUP

### For Mac/Linux:
```bash
chmod +x auto-setup.sh
./auto-setup.sh
```

### For Windows:
```cmd
auto-setup.bat
```

That's it! The script will:
✅ Create D1 database automatically
✅ Update configuration automatically  
✅ Run migrations automatically
✅ Create R2 bucket automatically
✅ Set security token automatically
✅ Deploy to Cloudflare automatically

## 🔄 For GitHub Auto-Deploy

After running auto-setup once locally:

1. Commit and push to GitHub:
```bash
git add .
git commit -m "Setup complete"
git push
```

2. Connect to Cloudflare Pages:
   - Go to Cloudflare Dashboard
   - Workers & Pages → Create
   - Connect to Git → Select your repo
   - Build command: `echo "No build needed"`
   - Deploy!

## 🌐 Your API Endpoints

After deployment:
- `POST /auth/register` - Register user
- `POST /auth/login` - Login
- `GET /products` - List products
- `POST /products` - Create product
- And more...

## 📚 Full Documentation

See `SETUP.md` for detailed manual setup.
