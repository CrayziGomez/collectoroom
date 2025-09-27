# CollectoRoom - Your Digital Collection Space

This document outlines the key phases required to set up, enhance, and deploy your CollectoRoom application.

---

## Phase 1: Initial Setup & Database Configuration

This phase ensures your local development environment is running correctly and your Firestore database is properly configured.

### 1.1: Environment Variables
- **Objective:** Securely store your Firebase project configuration.
- **Action:**
  - In the root of your project, create a file named `.env.local`.
  - Add your Firebase project configuration to this file. This should have been provided during the initial setup.

### 1.2: Install Dependencies
- **Objective:** Install all the necessary Node.js packages.
- **Action:**
  - Open your terminal and run `npm install`.

### 1.3: Run the Development Server
- **Objective:** Start the local Next.js server to view your application.
- **Action:**
  - Run `npm run dev`.
  - Open your browser to `http://localhost:3000`.

### 1.4: Create Firestore Indexes
- **Objective:** Create the necessary composite indexes in Firestore to enable complex queries for chats and notifications, preventing app crashes for logged-in users.
- **Action:**
  - While logged into the app locally, check your Next.js terminal for `FirebaseError` messages containing links to create indexes.
  - Click on each unique link to open the Firebase Console with the index fields pre-filled.
  - Click "Create" for each one. The indexes may take a few minutes to build.
  - **Note:** The key index files are `src/components/layout/Header.tsx` and `src/app/(pages)/messages/page.tsx`, which contain comments with these links.

---

## Phase 2: Firebase Storage & Feature Enhancement

This phase integrates Firebase Storage for file uploads, starting with user avatars.

### 2.1: Enable Firebase Storage
- **Objective:** Activate the Storage service in your Firebase project.
- **Action:**
  - Go to the [Firebase Console](https://console.firebase.google.com/).
  - Select your project.
  - In the left-hand menu, go to **Build > Storage**.
  - Click "Get started" and follow the prompts to enable it. You can use the default security rules for now, as we will override them.

### 2.2: Implement Profile Photo Uploads
- **Objective:** Allow users to upload and change their profile avatar.
- **Status:** **Implemented.** The code for this is now in place. Users can change their avatar from the "Profile Settings" page.

### 2.3: Implement Collection & Card Image Uploads
- **Objective:** Replace placeholder images with real image uploads for collections and cards.
- **Action:**
  - This will involve updating the "Create/Edit Collection" and "Add/Edit Card" pages to include file upload components.
  - Server actions will be created to handle the image uploads to the correct paths in Firebase Storage (e.g., `users/{userId}/collections/{collectionId}/` and `users/{userId}/cards/{cardId}/`).

---

## Phase 3: GitHub Integration & Continuous Deployment

This phase connects your project to a GitHub repository for version control and automated deployments.

### 3.1: Initialize a Git Repository
- **Objective:** Set up version control for your project.
- **Action:**
  - In your project's root directory, run `git init -b main`.
  - Create a `.gitignore` file (if one doesn't exist) and add `node_modules`, `.next`, and `.env.local` to it.
  - Run `git add .` and `git commit -m "Initial commit"`.

### 3.2: Create a GitHub Repository
- **Objective:** Host your code on GitHub.
- **Action:**
  - Go to your GitHub account.
  - Create a new repository (do not initialize it with a README or license).
  - Follow the instructions to "push an existing repository from the command line". The commands will look like this:
    ```bash
    git remote add origin https://github.com/YOUR_USERNAME/YOUR_REPOSITORY.git
    git push -u origin main
    ```

### 3.3: Set up App Hosting CI/CD
- **Objective:** Automatically deploy your application when you push changes to GitHub.
- **Action:**
  - In the Firebase Console, go to **Build > App Hosting**.
  - Follow the prompts to connect your GitHub account and select the repository you just created.
  - This will create a service account and secrets in GitHub to allow deployments. Your `apphosting.yaml` file is already configured.

---

## Phase 4: Publishing

This is the final phase to make your site live on a custom domain.

### 4.1: Connect a Custom Domain
- **Objective:** Serve your app from a domain you own.
- **Action:**
  - In the Firebase Console, go to **Build > App Hosting**.
  - Click "Manage" on your backend.
  - Go to the "Domains" tab and click "Add custom domain".
  - Follow the wizard to verify your domain ownership and update your DNS records.

### 4.2: Go Live!
- **Objective:** Your site is now live and deployed.
- **Action:**
  - After pushing to your `main` branch and a successful build, your site will be available at your custom domain. Congratulations!
