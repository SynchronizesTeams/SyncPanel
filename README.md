# Self-Hosted Cloudflare Hosting Panel (CloudPanel)

A modern, self-hosted web hosting control panel that runs on Linux and integrates with Cloudflare (DNS + Tunnel) for multi-account static website hosting.

## Key Features

- **Multi-Tenant Static Website Hosting**: Upload ZIP archives containing static site builds (HTML/CSS/JS/Assets).
- **User Isolation & Security**: Safe path-traversal prevention, isolated website directory structure, and non-root execution.
- **Cloudflare Integration**: Automatic DNS management and proxying through a central Cloudflare Tunnel.
- **Quota & Resource Management**: Enforce limits on websites count, storage usage (MB), and DNS record creation.
- **Audit Logging**: Comprehensive activity tracking for administrative and security actions.
- **CLI & System Utilities**: Includes `cloudpanel` CLI, systemd integration, doctor diagnostics, automated installer/uninstaller, and backup tools.

## Architecture

```text
                    Internet
                       |
                       v
                +--------------+
                |  Cloudflare  |
                | DNS + Tunnel |
                +------+-------+
                       |
                Cloudflare Tunnel
                       |
                       v
              +-------------------+
              |    Hosting VM     |
              |                   |
              |  +-------------+  |
              |  |    Panel    |  |
              |  | Laravel API |  |
              |  +------+------+  |
              |         |         |
              |         v         |
              |      Nginx        |
              |         |         |
              |    +----+----+    |
              |   Web1 Web2 Web3  |
              +-------------------+
```

## Production Installation (Debian 13)

```bash
wget https://raw.githubusercontent.com/user/cloudpanel/main/installer/install.sh
chmod +x install.sh
sudo ./install.sh
```

## License

MIT License.
