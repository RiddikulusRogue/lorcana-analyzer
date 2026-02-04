# GitHub Setup Instructions for Lorcana Analyzer

## Step 1: Create GitHub Account (if you don't have one)
1. Go to **https://github.com**
2. Click "Sign Up"
3. Create account with email & password
4. Verify email

---

## Step 2: Create a New Repository on GitHub

1. Go to **https://github.com/new**
2. Fill in:
   - **Repository name**: `lorcana-analyzer`
   - **Description**: `Disney Lorcana Deck Analyzer with AI Coaching`
   - **Public** (so others can access it)
   - **Initialize with:** None (uncheck if checked)
3. Click **"Create repository"**

You'll see a page with instructions. Copy the URL it shows (looks like `https://github.com/YOUR_USERNAME/lorcana-analyzer.git`)

---

## Step 3: Push Code to GitHub

**Open PowerShell and run these commands:**

```powershell
cd C:\workspace\lorcana-analyzer

git config --global user.name "YOUR_NAME"
git config --global user.email "YOUR_EMAIL@gmail.com"

git init
git branch -M main
git add .
git commit -m "Initial commit: Lorcana Deck Analyzer with comprehensive AI coaching"
git remote add origin https://github.com/YOUR_USERNAME/lorcana-analyzer.git
git push -u origin main
```

**Replace:**
- `YOUR_NAME` with your name
- `YOUR_EMAIL@gmail.com` with your email
- `YOUR_USERNAME` with your GitHub username

When prompted for password, use your **GitHub Personal Access Token** (not password):
1. Go to **https://github.com/settings/tokens**
2. Click "Generate new token" → "Generate new token (classic)"
3. Name it: `github-access`
4. Check: `repo` (full control of private repositories)
5. Click "Generate token"
6. Copy the token (shown once!)
7. Paste it when Git asks for password

---

## Step 4: Enable GitHub Pages

1. Go to your repository: **https://github.com/YOUR_USERNAME/lorcana-analyzer**
2. Click **Settings** (top right)
3. Click **Pages** (left sidebar)
4. Under "Source":
   - Select branch: **main**
   - Select folder: **/dist** ← Important!
5. Click **Save**
6. Wait ~1 minute for deployment
7. Your site is now live at: **https://YOUR_USERNAME.github.io/lorcana-analyzer/**

---

## Step 5: Share the Link!

Once deployed, you can share:
- **Live App**: `https://YOUR_USERNAME.github.io/lorcana-analyzer/`
- **Repository**: `https://github.com/YOUR_USERNAME/lorcana-analyzer`

Anyone with the first link can use the analyzer without installing anything!

---

## Troubleshooting

**"Git command not found"**
- Close and reopen PowerShell after installing Git
- Or restart your computer

**"GitHub Pages not building"**
- Make sure you selected `/dist` folder (not root)
- Wait 2-3 minutes for GitHub to rebuild

**"Authentication failed"**
- Use Personal Access Token, not password
- Generate new token if needed

---

## That's it! 🎉

You now have:
✅ Code backed up on GitHub
✅ Public repository anyone can view
✅ Live web app accessible from anywhere
✅ All 1,156 lines of coaching ready to use!
