# Cloudinary Setup Guide

## Installation

Install Cloudinary SDK:

```bash
npm install cloudinary
```

## Environment Variables

Add the following environment variables to your `.env` file:

```env
CLOUDINARY_CLOUD_NAME=your_cloud_name
CLOUDINARY_API_KEY=your_api_key
CLOUDINARY_API_SECRET=your_api_secret
```

## Getting Cloudinary Credentials

1. Sign up for a free account at [https://cloudinary.com](https://cloudinary.com)
2. Go to Dashboard
3. Copy your:
   - Cloud Name
   - API Key
   - API Secret

## Features

- Automatic image optimization (quality: auto, format: auto)
- Automatic face detection and cropping (500x500)
- Automatic deletion of old avatars when uploading new ones
- Secure HTTPS URLs

## Usage

The avatar upload endpoint (`POST /api/v1/users/avatar`) will automatically:
1. Upload the image to Cloudinary
2. Optimize and transform the image
3. Save the Cloudinary URL to the database
4. Delete the old avatar from Cloudinary (if exists)

