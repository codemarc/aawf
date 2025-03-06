import path from "node:path"
import fs from "node:fs"
import crypto from "node:crypto"
import chalkPipe from "chalk-pipe"
import yaml from "js-yaml"

// ----------------------------------------------------------------------------
// Error codes
// ----------------------------------------------------------------------------
export const EOK = Symbol(0)
export const EGENERIC = Symbol(1)
export const ENOTASK = Symbol(2)
export const ENOTFOUND = Symbol(3)

// ----------------------------------------------------------------------------
// timestamp function that returns a string in the
// format of "YYYYmmdd HH:MM:SS:ms am/pm"
// ----------------------------------------------------------------------------
export const ts = (label) => {
  const dt = new Date()
  const ms = dt.getMilliseconds().toString().padStart(3, "0")
  const ampm = dt.getHours() >= 12 ? "pm" : "am"
  const t = dt
    .toLocaleTimeString("en-US", {
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
      hour12: true
    })
    .replace(/(\d+):(\d+):(\d+)\s(am|pm)/i, "$1:$2:$3")

  return `${t}:${ms} ${ampm} ${label}`
}

// =============================================================================
// util class
//
// The `util` class provides utility functions and properties
// for the application.`
// =============================================================================
export default class util {
  constructor(logger, args, options, name = "aawf") {
    if (util.instance) {
      util.instance.logger = logger
      util.instance.options = options
      util.instance.args = args
      util.instance.name = name

      // biome-ignore lint/correctness/noConstructorReturn: <explanation>
      return util.instance
    }

    this.name = name
    this.label = name

    this.cpinfo = chalkPipe("black")
    this.cpverbose = chalkPipe("blue")
    this.cperror = chalkPipe("red")

    this.config_path = path.resolve(
      path.normalize(process.env.AWWF_CONFIG_PATH || path.join(process.cwd(), "config"))
    )
    this.data_path = path.resolve(
      path.normalize(process.env.AWWF_DATA_FOLDER || path.join(process.cwd(), "data"))
    )
    this.logger = logger
    this.options = options
    this.args = args

    util.instance = this
  }

  getLogger() {
    return this.logger
  }

  setLabel(label) {
    this.label = label
  }

  getLabel() {
    return this.label
  }

  info(message) {
    if (!this.options?.quiet) {
      const msg = `${ts(this.label)} ${this.cpinfo(message)}`
      if (this.logger) this.logger.info(msg)
      else console(this.cperror(msg))
    }
  }

  error(message) {
    if (!this.options?.quiet) {
      const msg = `${ts(this.label)} ${this.cperror(message)}`
      if (this.logger) this.logger.error(msg)
      else console.error(this.cperror(msg))
    }
  }

  verbose(message) {
    if (!this.options?.quiet && this.options?.verbose) {
      const msg = `${ts(this.label)} ${this.cpverbose(message)}`
      if (this.logger) this.logger.info(msg)
      else console.log(msg)
    }
  }

  debug(message) {
    this.verbose(message)
  }

  // ------------------------------------------------------------------------
  // getcrypt
  // ------------------------------------------------------------------------
  getcrypt = (preseed) => {
    const separator = "::"
    const seed =
      preseed !== undefined && typeof preseed === "string" ? preseed : process.env.SMASH_KEY
    if (!seed) throw new Error("No seed provided")
    const key = crypto.createHash("sha256").update(seed).digest("hex").slice(16, 48)
    return { key, separator }
  }

  // ------------------------------------------------------------------------
  // Encrypts a string using AES-256-CBC encryption
  // ------------------------------------------------------------------------
  encrypt = (string, preseed) => {
    const { key, separator } = this.getcrypt(preseed)
    try {
      const rando = crypto.randomBytes(16)
      const cipher = crypto.createCipheriv("aes-256-cbc", key, rando)
      let encryptedString = cipher.update(string)
      encryptedString = Buffer.concat([encryptedString, cipher.final()])
      return rando.toString("hex") + separator + encryptedString.toString("hex")
    } catch (e) {
      throw new Error(`Encryption failed: ${e.message}\n`)
    }
  }

  // ------------------------------------------------------------------------
  // Decrypts an AES-256-CBC encrypted string
  // ------------------------------------------------------------------------
  decrypt = (string, preseed) => {
    const { key, separator } = this.getcrypt(preseed)
    try {
      const split = string.split(separator)
      const iv = Buffer.from(split[0], "hex")
      split.shift()
      const encryptedText = Buffer.from(split.join(separator), "hex")
      const decipher = crypto.createDecipheriv("aes-256-cbc", key, iv)
      let decrypted = decipher.update(encryptedText)
      decrypted = Buffer.concat([decrypted, decipher.final()])
      return decrypted.toString()
    } catch (e) {
      throw new Error(`Decryption failed: ${e.message}\n`)
    }
  }

  // ------------------------------------------------------------------------
  // load
  // ------------------------------------------------------------------------
  load = (taskid) => {
    // validate the config directory exists
    if (!fs.existsSync(this.config_path)) {
      this.error(`config directory not found: ${this.config_path}`)
      return null
    }

    if (!taskid) {
      this.info("configured tasks:")
      const tasks = fs.readdirSync(this.config_path)
      for (const task of tasks) {
        this.info(`   - ${path.basename(task, ".yml.bin").substring("tasks-mail-".length)}`)
      }
      return null
    }

    const configFile = path.join(this.config_path, `${this.name}-${taskid}.yml.bin`)
    this.debug(`config: ${configFile}`)

    if (!fs.existsSync(configFile)) {
      this.error(`config file not found: ${configFile}`)
      return null
    }

    // load the config file
    try {
      const cfgdata = fs.readFileSync(configFile, "utf8")
      return yaml.load(this.decrypt(cfgdata))
    } catch (err) {
      this.error(err)
      return null
    }
  }
}
