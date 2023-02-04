# free@home Monitor

A monitor that connects to the free@home SysAP and logs device updates to STDOUT as JSONL or logfmt.

## Usage Requirements

- A free@home System Access Point 2.0 running firmware > v3.0
- Local API has to be enabled for the user account to be used

## Running the monitor

Regardless of how you want to run the monitor you'll need to configure the environment. The hostname and credentials for the free@home runner are taken from the following environment variables:

- `SYSAP_HOST`: The host name or IP address of the free@home System Access Point.
- `SYSAP_USER_ID`: The user id of the local API user. This is probably a GUID.
- `SYSAP_PASSWORD`: The password corresponding to the user ID.

You can either set the environment variables manually, or you can put them in an `.env` file like so:

```
SYSAP_HOST=192.168.178.10
SYSAP_USER_ID=01234567-89ab-cdef-0123-456789abcdef
SYSAP_PASSWORD=s3cr3t_p4ssW0rD

```

## Run locally

**Prerequisites:**

- A version of NodeJS that supports running ESM scripts is installed (v12+ or older with workarounds). The monitor is tested with Node v16 and v18.
- Environment variables are set or an .env file is configured.

In the repository base directory install the script dependencies by running `npm install`. Then you can run the monitor by running `npm run start` or `node index.mjs`. To stop the monitor send an interrupt signal by pressing `Ctrl+C`.

## Run in Docker

You can pull the latest image from the GitHub Container Registry by calling `docker pull ghcr.io/pgerke/freeathome-monitor:latest`. Then you can run

```bash
docker run -e SYSAP_HOST="192.168.178.10" -e SYSAP_USER_ID="01234567-89ab-cdef-0123-456789abcdef" -e SYSAP_PASSWORD="s3cr3t_p4ssW0rD" ghcr.io/pgerke/freeathome-monitor:latest npm run start
```

Alternatively you can create an `.env` file as shown above and mount it in the container by calling `docker run -v $(pwd)/.env:/app/.env ghcr.io/pgerke/freeathome-monitor:latest npm run start`.

## Using logfmt

logfmt is a logging format that writes messages as a list of key-value pairs. This makes it a good option, if you want to have your logs automatically tagged and labels by applications such as Loki or Logstash. To activate logfmt add the `--logfmt` option to the command invokation:

```bash
npm run start -- --logfmt
```

or the Docker variant

```bash
docker run -e SYSAP_HOST="192.168.178.10" -e SYSAP_USER_ID="01234567-89ab-cdef-0123-456789abcdef" -e SYSAP_PASSWORD="s3cr3t_p4ssW0rD" ghcr.io/pgerke/freeathome-monitor:latest node index.mjs --logfmt
```

## I have a feature request or found a bug, what do I do?

Please create a [GitHub issue](https://github.com/pgerke/freeathome-monitor/issues)!

## Non-Affiliation Disclaimer

This library is not endorsed by, directly affiliated with, maintained, authorized, or sponsored by Busch-Jaeger Elektro GmbH or ABB Asea Brown Boveri Ltd or . All product and company names are the registered trademarks of their original owners. The use of any trade name or trademark is for identification and reference purposes only and does not imply any association with the trademark holder of their product brand.

## License

The project is subject to the MIT license unless otherwise noted.

<hr>

Made with ❤️ by [Philip Gerke](https://github.com/pgerke)
