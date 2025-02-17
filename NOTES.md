# aawf
Agentic AI Workflow Framework

This file holds the braintrailz for this project. Its purpose is to record and track decisions, ideas, and other thoughts as we build the project.
new items are added to the top of the file below the line.

---

## 2025-02-17

While building the project, there are 5 directories that are important to understand:

### config

The config directory is sym-linked to the project root.
- holds the configuration for the project
- includes task configuration files of the form `config/task-tasktype-taskid.yml`
- include flow configuration files of the form `config/flow-flowtype>-flowid.yml`

### data

The data directory is sym-linked to the project root.
- holds the data for the project
- includes the data for the tasks and flows

### tasks 

### flows

### patches

After trying to figure out how to update the global help in caporal, I decided to create a patch.
To create a patch for help.js, you can use the diff command-line tool to generate a patch file. Here's a step-by-step guide:

* Make a Backup of the Original File
* Edit the File
* npm install patch-package@latest --save-dev
* npx patch-package caporal
* updated package.json

"scripts": {
  "postinstall": "patch-package"
}

Note: if you need to recreate the patch ry using npm as I have had problems using pnpm


### npx in pnpm?

Running executables inside your downloaded dependencies  
For example npx jest.  
The pnpm equivalent is pnpm exec jest.  
Running executable commands in packages you want to download transiently  
For example npx create-react-app my-app.  
The pnpm equivalent of this is pnpm dlx create-react-app my-app.  

### secrets at rest 

At first I was going to be ver selective about what secrets are encrypted at rest. But then I thought, why not just encrypt the the complete config files.
decrypy what you need when you need it. so instead of implementing smash in the framework, I'll just encrypt the config files at rest by including smashdata with the toolchain. run pnpm exec smash to encrypt or decrypt the config files.
