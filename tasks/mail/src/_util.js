import Util from "./util.js"
import { ImapFlow } from "imapflow"

// =============================================================================
// _util class
//
// The `util` class provides utility functions and properties the specific task
// or flow
// =============================================================================
export default class _util extends Util {
  constructor(logger, args, options, name = "tasks-mail") {
    super(logger, args, options, name)

    this.scanLimit = process.env.AWWF_SCAN_LIMIT || "5"
    this.scanSkip = process.env.AWWF_SCAN_SKIP || "0"
    this.scanDate = process.env.AWWF_SCAN_DATE || "today"
    this.scanFolder = process.env.AWWF_SCAN_FOLDER || "INBOX"
    this.scanUnread = process.env.AWWF_SCAN_UNREAD || "false"
    this.scanTagged = process.env.AWWF_SCAN_TAGGED || "false"
  }

  getScanLimit() {
    return this.scanLimit
  }

  getScanSkip() {
    return this.scanSkip
  }

  getScanDate() {
    return this.scanDate
  }

  getScanFolder() {
    return this.scanFolder
  }

  getScanUnread() {
    return this.scanUnread
  }

  getScanTagged() {
    return this.scanTagged
  }

  getImapFlow(cfg, nologger) {
    return new ImapFlow({
      host: cfg.host,
      port: cfg.port,
      secure: true,
      auth: { user: cfg.user, pass: cfg.password },
      logger: nologger ?? false
    })
  }

  getFolderPath = async (client, name) => {
    if (name?.toLowerCase() === "inbox") {
      return "INBOX"
    }
    const folders = await client.list()
    const folder = folders.find((f) => f.name === name)?.path

    if (name === "Archive") {
      return folder ?? "[Gmail]/All Mail"
    }
    return folder ?? folders.find((f) => f.path === name)?.path
  }
}
