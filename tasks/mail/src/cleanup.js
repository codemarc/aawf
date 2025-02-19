import util from "./_util.js"

// =============================================================================
// cleanup a mailbox
// =============================================================================
export async function cleanupCommand(args, options, logger) {
  const u = new util(logger, args, options, "tasks-mail")
  u.setLabel("cleanup:")
  u.info(args.taskid)
  u.info("loading config...")
  const config = u.load(args.taskid)

  if (config == null) {
    u.info("nothing to do")
    return 0
  }

  if (config.name !== args.taskid) {
    u.error(`${config.name} != ${args.taskid}`)
    return 1
  }

  if (options.verbose) {
    console.dir(
      Object.assign({}, config, {
        mail: { ...config.mail, password: u.encrypt(config.mail.password) }
      })
    )
  }

  // ----------------------------------------------------------------------------
  // Helper function to get folder path and acquire mailbox lock
  // ----------------------------------------------------------------------------
  const getFolderAndLock = async (client, folder, op = "processing") => {
    const targ = await u.getFolderPath(client, folder)
    u.info(`${op} ${folder} from ${targ}`.toLowerCase())
    return await client.getMailboxLock(targ)
  }

  // ----------------------------------------------------------------------------
  // Marks all unread messages in specified folder as read
  // ----------------------------------------------------------------------------
  const clear = async (client, folder) => {
    const lock = await getFolderAndLock(client, folder, "clearing")
    const fold = folder.toLowerCase()
    try {
      const messages = await client.search({ unseen: true })
      if (messages.length > 0) {
        await client.messageFlagsAdd(messages, ["\\Seen"])
        u.info(`marked ${messages.length} messages as read in ${fold}`)
      } else {
        u.info(`all messages have been marked as read in ${fold}`)
      }
    } finally {
      lock.release()
    }
  }

  // ----------------------------------------------------------------------------
  // Permanently deletes all messages from specified folder
  // ----------------------------------------------------------------------------
  const empty = async (client, folder) => {
    const lock = await getFolderAndLock(client, folder, "emptying")
    const fold = folder.toLowerCase()
    try {
      const messages = await client.search({ all: true })
      if (messages.length > 0) {
        await client.messageDelete(messages)
        u.info(`emptied ${fold} - ${messages.length} messages`)
      } else {
        u.info(`${fold} is already empty`)
      }
    } finally {
      lock.release()
    }
  }

  // ----------------------------------------------------------------------------
  const client = u.getImapFlow(config.mail)
  try {
    u.info("connecting to mail server...")
    await client.connect()

    const promises = []
    if (!options.noarchive) promises.push(clear(client, "Archive"))
    else u.info("skipping archive")
    if (!options.notrash) promises.push(empty(client, "Trash"))
    else u.info("skipping trash")
    if (!options.nospam) promises.push(empty(client, "Spam"))
    else u.info("skipping spam")
    if (!options.nodrafts) promises.push(empty(client, "Drafts"))
    else u.info("skipping drafts")
    await Promise.all(promises)
  } catch (err) {
    if (options.verbose) logger.debug(err.stack)
    else logger.error(err)
  } finally {
    await client.close()
  }

  return 0
}
