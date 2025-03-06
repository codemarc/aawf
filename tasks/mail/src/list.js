import util from "./_util.js"

// =============================================================================
// list folders or tasks
// =============================================================================
export async function listCommand(args, options, logger) {
  const u = new util(logger, args, options, "tasks-mail")
  u.setLabel("list:")

  // If no taskid provided, list all available tasks
  if (!args.taskid) {
    u.load()
    return u.EOK
  }

  // Otherwise load the task and list its folders
  u.info(args.taskid)
  u.info("loading config...")
  const config = u.load(args.taskid)
  if (config == null) {
    u.info("nothing to do")
    return u.ENOTFOUND
  }

  if (config.name !== args.taskid) {
    u.error(`${config.name} != ${args.taskid}`)
    return u.ENOTASK
  }

  if (options.verbose) {
    console.dir(
      Object.assign({}, config, {
        mail: { ...config.mail, password: u.encrypt(config.mail.password) }
      })
    )
  }

  // ----------------------------------------------------------------------------
  // connect to mail server
  // ----------------------------------------------------------------------------
  const client = u.getImapFlow(config.mail, false)
  try {
    u.info("connecting to mail server...")
    await client.connect()
    const folders = await client.list()

    // List all folders
    u.info("available folders:")
    for (let [index, folder] of folders.entries()) {
      const flags = folder.flags?.length > 0 ? ` [${folder.flags.join(", ")}]` : ""
      u.info(`[${index++}] ${folder.path}${flags}`)
      if (options.verbose) {
        console.dir(folder)
      }
    }
  } catch (err) {
    if (options.verbose) logger.debug(err.stack)
    else logger.error(err)
  } finally {
    await client.close()
  }
  return u.EOK
}
