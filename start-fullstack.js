#!/usr/bin/env node

/**
 * 🚀 Full-Stack Startup Script
 * Khởi động cả Backend Node.js và Frontend Next.js
 */

const { spawn } = require('child_process');
const path = require('path');
const fs = require('fs');

class FullStackStarter {
  constructor() {
    this.processes = [];
    this.isShuttingDown = false;
  }

  log(message, type = 'info') {
    const timestamp = new Date().toLocaleTimeString();
    const colors = {
      info: '\x1b[36m',    // Cyan
      success: '\x1b[32m', // Green
      error: '\x1b[31m',   // Red
      warning: '\x1b[33m', // Yellow
      backend: '\x1b[35m', // Magenta
      frontend: '\x1b[34m' // Blue
    };
    
    console.log(`${colors[type]}[${timestamp}] ${message}\x1b[0m`);
  }

  async checkPrerequisites() {
    this.log('🔍 Checking prerequisites...', 'info');

    // Check if backend package.json exists
    if (!fs.existsSync('package.json')) {
      this.log('❌ Backend package.json not found!', 'error');
      return false;
    }

    // Check if frontend package.json exists
    if (!fs.existsSync('clientCompany/package.json')) {
      this.log('❌ Frontend package.json not found!', 'error');
      return false;
    }

    // Check if backend node_modules exists
    if (!fs.existsSync('node_modules')) {
      this.log('📦 Installing backend dependencies...', 'warning');
      await this.runCommand('npm', ['install'], process.cwd());
    }

    // Check if frontend node_modules exists
    if (!fs.existsSync('clientCompany/node_modules')) {
      this.log('📦 Installing frontend dependencies...', 'warning');
      await this.runCommand('npm', ['install'], path.join(process.cwd(), 'clientCompany'));
    }

    // Check environment files
    if (!fs.existsSync('.env')) {
      this.log('⚠️  Backend .env file not found! Please create it.', 'warning');
    }

    if (!fs.existsSync('clientCompany/.env.local')) {
      this.log('⚠️  Frontend .env.local file not found! Please create it.', 'warning');
    }

    this.log('✅ Prerequisites check completed', 'success');
    return true;
  }

  async runCommand(command, args, cwd) {
    return new Promise((resolve, reject) => {
      const child = spawn(command, args, {
        cwd,
        stdio: 'inherit',
        shell: true
      });

      child.on('close', (code) => {
        if (code === 0) {
          resolve();
        } else {
          reject(new Error(`Command failed with code ${code}`));
        }
      });

      child.on('error', reject);
    });
  }

  startBackend() {
    this.log('🚀 Starting Backend (Node.js) on port 8081...', 'backend');
    
    const backend = spawn('npm', ['run', 'dev'], {
      cwd: process.cwd(),
      stdio: 'pipe',
      shell: true
    });

    backend.stdout.on('data', (data) => {
      const output = data.toString().trim();
      if (output) {
        this.log(`[BACKEND] ${output}`, 'backend');
      }
    });

    backend.stderr.on('data', (data) => {
      const output = data.toString().trim();
      if (output && !output.includes('DeprecationWarning')) {
        this.log(`[BACKEND ERROR] ${output}`, 'error');
      }
    });

    backend.on('close', (code) => {
      if (!this.isShuttingDown) {
        this.log(`❌ Backend process exited with code ${code}`, 'error');
      }
    });

    this.processes.push({ name: 'Backend', process: backend });
    return backend;
  }

  startFrontend() {
    this.log('🚀 Starting Frontend (Next.js) on port 3000...', 'frontend');
    
    const frontend = spawn('npm', ['run', 'dev'], {
      cwd: path.join(process.cwd(), 'clientCompany'),
      stdio: 'pipe',
      shell: true
    });

    frontend.stdout.on('data', (data) => {
      const output = data.toString().trim();
      if (output) {
        this.log(`[FRONTEND] ${output}`, 'frontend');
      }
    });

    frontend.stderr.on('data', (data) => {
      const output = data.toString().trim();
      if (output && !output.includes('DeprecationWarning')) {
        this.log(`[FRONTEND ERROR] ${output}`, 'error');
      }
    });

    frontend.on('close', (code) => {
      if (!this.isShuttingDown) {
        this.log(`❌ Frontend process exited with code ${code}`, 'error');
      }
    });

    this.processes.push({ name: 'Frontend', process: frontend });
    return frontend;
  }

  setupGracefulShutdown() {
    const shutdown = () => {
      if (this.isShuttingDown) return;
      
      this.isShuttingDown = true;
      this.log('🛑 Shutting down all processes...', 'warning');

      this.processes.forEach(({ name, process }) => {
        this.log(`Stopping ${name}...`, 'warning');
        process.kill('SIGTERM');
      });

      setTimeout(() => {
        this.processes.forEach(({ name, process }) => {
          if (!process.killed) {
            this.log(`Force killing ${name}...`, 'error');
            process.kill('SIGKILL');
          }
        });
        process.exit(0);
      }, 5000);
    };

    process.on('SIGINT', shutdown);
    process.on('SIGTERM', shutdown);
    process.on('exit', shutdown);
  }

  async start() {
    console.log('\n🎯 Full-Stack E-Commerce System Starter');
    console.log('=====================================\n');

    try {
      // Check prerequisites
      const prereqsOk = await this.checkPrerequisites();
      if (!prereqsOk) {
        this.log('❌ Prerequisites check failed. Please fix the issues above.', 'error');
        process.exit(1);
      }

      // Setup graceful shutdown
      this.setupGracefulShutdown();

      // Start backend first
      this.startBackend();
      
      // Wait a bit for backend to start
      await new Promise(resolve => setTimeout(resolve, 3000));
      
      // Start frontend
      this.startFrontend();

      // Show success message
      setTimeout(() => {
        console.log('\n' + '='.repeat(60));
        this.log('🎉 Full-Stack System Started Successfully!', 'success');
        console.log('='.repeat(60));
        this.log('🔗 Backend API: http://localhost:8081', 'backend');
        this.log('🌐 Frontend App: http://localhost:3000', 'frontend');
        this.log('📚 API Docs: http://localhost:8081/api-docs', 'info');
        console.log('='.repeat(60));
        this.log('Press Ctrl+C to stop all services', 'warning');
        console.log('');
      }, 5000);

    } catch (error) {
      this.log(`❌ Startup failed: ${error.message}`, 'error');
      process.exit(1);
    }
  }
}

// Run if this script is executed directly
if (require.main === module) {
  const starter = new FullStackStarter();
  starter.start().catch(error => {
    console.error('❌ Failed to start full-stack system:', error);
    process.exit(1);
  });
}

module.exports = FullStackStarter;
