# aawf
Agentic AI Workflow Framework

This file holds the braintrailz for this project. Its purpose is to record and track decisions, ideas, and other thoughts as we build the project.
new items are added to the top of the file below the line.

---

## 2025-03-06

Today I was working on the mail module and implemented a two sub commands:
list and move. 

Without any arguments, list generates displays the taskids of mail configured tasks.
Pass a taskid and it will list the folders of the account associated with the task.

The move command allows you to move a mail messages from a source to a target in the same mail account.

both these oprations need unit tests and documentation.


## linked directories

The project uses sym-links to link the config, data, tasks, flows, and patches directories to the project root. This allows for the project to be used as a library in other projects.

## util

lib/util.js is a class that is used to manage the utility functions for the project. It is a singleton that is used to manage the utility functions for the project. 

aawaf implements tasks and flows. _util.js is a class that is used to manage the utility functions for a specific task  or flow or group of tasks and flows. It extense the common util function in lib.

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
