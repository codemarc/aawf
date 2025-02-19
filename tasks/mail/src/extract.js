// import fetch from "./fetch.js"
// import parsem from "./parse.js"
import Util from "./util.js"

// =============================================================================
// extract from mail
// =============================================================================
export async function extractCommand(args, options, logger) {
  const u = new Util(logger, "tasks-mail")
  const config = u.load(args.taskid)

  if (config == null) return

  if (config.name !== args.taskid) {
    logger.error(`taskid: ${config.name} != ${args.taskid}`)
    return
  }

  if (options.verbose) {
    console.dir(
      Object.assign({}, config, {
        mail: { ...config.mail, password: u.encrypt(config.mail.password) }
      })
    )
  }

  try {
    const answerset = await extract(config, args, options, logger)
    logger.info(`${answerset.length} messages matched`)
    for (const msg of answerset) {
      logger.info(`extract:${msg.index}:${msg.seq}: ${msg.subject}`)
    }
    return
  } catch (err) {
    if (options.verbose) logger.debug(err.stack)
    else logger.error(err)
  }
}

// =============================================================================
// extract emails
// =============================================================================
const extract = async (config, args, options, logger) => {
  // TODO: write extract

  return []
}
