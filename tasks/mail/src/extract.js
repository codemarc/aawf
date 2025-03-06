import { simpleParser } from "mailparser"
import util from "./_util.js"

// =============================================================================
// extract from mail
// =============================================================================
export async function extractCommand(args, options, logger) {
  const u = new util(logger, args, options, "tasks-mail")
  u.setLabel("extract:")
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
  // parse
  // ----------------------------------------------------------------------------
  async function parse(msglist, ...args) {
    if (msglist.length === 0) return msglist
    if (msglist[0].source === undefined) return msglist
    const [acct, options, client] = args

    const roundToMinutes = (date) => {
      const d = new Date(date)
      return Number.isNaN(d.getTime())
        ? undefined
        : new Date(d.getFullYear(), d.getMonth(), d.getDate(), d.getHours(), d.getMinutes())
    }

    // parse the message
    const scanlist = msglist.reverse()
    const answerset = []
    let ndx = 1
    for (const msg of scanlist) {
      const parsed = await simpleParser(msg.source)
      const newmsg = {
        index: ndx++,
        seq: msg.seq,
        senderEmail: parsed.from?.value?.[0]?.address?.toLowerCase(),
        recipientEmail: parsed.to?.value?.[0]?.address?.toLowerCase(),
        from: parsed.from?.text || "(unknown sender)",
        to: parsed.to?.text || "(unknown recipient)",
        subject: parsed.subject || "(no subject)",
        text: parsed.text
          ?.trim()
          .slice(0, 2048)
          .split("\n")
          .filter((line) => line.trim() !== "")
          .slice(0, 10),
        date: roundToMinutes(parsed.date) || "(no date)"
      }
      answerset.push(newmsg)
    }
    return answerset
  }

  // ----------------------------------------------------------------------------
  // getSearchOptions
  // https://imapflow.com/global.html#SearchObject
  // ----------------------------------------------------------------------------

  const getSearchOptions = (options) => {
    // set the search options
    let searchOptions = {}

    // add the unread option
    if (options.unread) searchOptions = Object.assign(searchOptions, { unseen: true })

    // add the tagged option
    if (options.tagged) searchOptions = Object.assign(searchOptions, { flagged: true })

    // add the date option
    if (options.date) {
      // if the date is true or "today", set the search options to today
      if (options.date === true || options.date === "today")
        searchOptions = Object.assign(searchOptions, { on: new Date() })

      // if the date is "yesterday", set the search options to yesterday
      if (options.date === "yesterday")
        searchOptions = Object.assign(searchOptions, {
          on: new Date(new Date().setDate(new Date().getDate() - 1))
        })

      // if the date is a number, set the search options to the date
      if (options.date < 0)
        searchOptions = Object.assign(searchOptions, {
          since: new Date(new Date().setDate(new Date().getDate() - Number.parseInt(options.date)))
        })

      // if the date is a date object, set the search options to the date
      if (options.date instanceof Date)
        searchOptions = Object.assign(searchOptions, { since: options.date })
    }

    // return the search options
    if (Object.keys(searchOptions).length === 0) searchOptions = { all: true }
    return searchOptions
  }

  // ===========================================================================
  // fetch
  // ===========================================================================
  async function fetch(client, options) {
    u.info("fetching messages")
    // get the folder option
    const opt = options.folder && typeof options.folder === "string" ? options.folder : "INBOX"
    u.verbose(`from folder ${opt}`)

    // get the folder path
    const src = await u.getFolderPath(client, opt)
    u.verbose(`resolved as ${src}`)

    // lock the mailbox to prevent other processes from accessing it
    u.verbose(`locking ${src}`)
    const lock = await client.getMailboxLock(src)
    try {
      // get the search options
      const searchOptions = getSearchOptions(options)

      // get the messages
      const messages = await client.search(searchOptions)

      // get the limit and skip options
      const limit = Number.parseInt(options.limit || u.getScanLimit())

      // get the skip option
      const skip = Number.parseInt(options.skip || u.getScanSkip())

      // get the messages to fetch
      const messagesToFetch = messages.slice(-limit - skip, -skip || undefined).reverse()

      // fetch the messages
      const msglist = await client.fetchAll(messagesToFetch, { source: true })
      u.verbose(`${msglist.length} messages fetched`)

      // return the messages
      return msglist
    } catch (err) {
      if (options.verbose) u.verbose(err.stack)
      else u.error(err)

      // always release the mailbox lock
    } finally {
      lock.release()
      u.verbose("mailbox unlocked")
    }
  }

  // ----------------------------------------------------------------------------
  // connect to mail server
  // ----------------------------------------------------------------------------
  const client = u.getImapFlow(config.mail)
  try {
    u.info("connecting to mail server...")
    await client.connect()
    const msglist = await fetch(client, options)
    const answerset = await parse(msglist, config, options, client)
    u.verbose(`${answerset.length} messages parsed`)
    for (const msg of answerset) {
      u.info(JSON.stringify(msg, null, 2))
    }
    return answerset
  } catch (err) {
    if (options.verbose) logger.debug(err.stack)
    else logger.error(err)
  } finally {
    await client.close()
  }

  return 0
}
