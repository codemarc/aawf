import util from "./_util.js"

// =============================================================================
// move messages from one folder to another
// =============================================================================
export async function moveCommand(args, options, logger) {
  const u = new util(logger, args, options, "tasks-mail")
  u.setLabel("move:")
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
  const client = u.getImapFlow(config.mail)
  try {
    u.info("connecting to mail server...")
    await client.connect()

    // get the source and target folders
    const src = await u.getFolderPath(client, args.source)
    const trg = await u.getFolderPath(client, args.target)

    // get the limit
    const limit = options.limit ? Number.parseInt(options.limit) : u.getScanLimit()
    u.info(`preparing to moving ${limit} messages`)

    u.info(`from source(${src}) to target(${trg})`.toLowerCase())
    u.info(`locking source(${src})`)

    // lock the source folder
    const lock = await client.getMailboxLock(src)
    try {
      // get the search options
      const searchOptions = {}
      if (options.unread) searchOptions.unseen = true
      if (options.read) searchOptions.seen = true
      if (options.tagged) searchOptions.flagged = true
      if (Object.keys(searchOptions).length === 0) searchOptions.all = true

      const messages = await client.search(searchOptions)
      if (messages.length === 0) {
        u.info("no messages found to move")
        return u.ENOTFOUND
      }

      const moveBatchSize = 100 // Maximum messages to move per batch
      const totalMessages = Math.min(messages.length, limit)
      u.info(`${messages.length} messages in ${src}, will move ${totalMessages}`)

      const reversedMessages = messages.reverse()
      let processed = 0

      while (processed < totalMessages) {
        const batchSize = Math.min(moveBatchSize, totalMessages - processed)
        const batch = reversedMessages.slice(processed, processed + batchSize)
        u.info(
          `Moving batch of ${batch.length} messages (${processed + 1} to ${processed + batch.length})`
        )
        await client.messageMove(batch, trg)
        processed += batch.length
      }
    } catch (err) {
      if (options.verbose) logger.debug(err.stack)
      else logger.error(err)
    } finally {
      lock.release()
    }
  } catch (err) {
    if (options.verbose) logger.debug(err.stack)
    else logger.error(err)
  } finally {
    await client.close()
  }
  return u.EOK
}
