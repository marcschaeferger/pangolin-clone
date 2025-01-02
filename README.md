# Pangolin

Pangolin is a self-hosted reverse proxy management server with identity and access management, designed to securely expose private resources through encrypted [WireGuard](https://www.wireguard.com/) tunnels. With Pangolin, you retain full control over your infrastructure while providing a user-friendly and feature-rich solution for managing proxies, authentication, and access, and simplifiy complex network setups.

---

## Key Features

### Secure Reverse Proxy Management

-   Expose private resources on your network without opening ports.
-   Built-in support for WireGuard tunnels for secure and efficient site-to-site connectivity.
-   Automated SSL certificates (https) via [LetsEncrypt](https://letsencrypt.org/).

### Identity & Access Management

-   Centralized authentication system using platform SSO. Users will only have to manage one login.
-   Create organizations, each with multiple sites, users, and roles.
-   Role-based access control to manage resource access permissions.
-   Authentication options include:
    -   Email whitelisting with one-time passcodes.
    -   Temporary, self-destructing share links.
    -   Resource specific pin codes.
    -   Resource specific passwords.

### Modular Design

-   Extend functionality with existing [Traefik](https://github.com/traefik/traefik) plugins, such as [Fail2Ban](https://plugins.traefik.io/plugins/628c9ebcffc0cd18356a979f/fail2-ban) or [CrowdSec](https://plugins.traefik.io/plugins/6335346ca4caa9ddeffda116/crowdsec-bouncer-traefik-plugin), which integrate seamlessly.
-   Attach as many sites to the central server as you wish.

### Flexible Deployment

-   Docker Compose-based setup for simplified deployment.
-   Future-proof installation script for streamlined setup and feature additions.
-   Run on any VPS.
-   Use your preferred WireGuard client to connect, or use Newt, our custom client for the best user experience.

---

## Workflow Example

### Deployment and Usage Example

1. **Deploy the Central Server**:  
   Deploy the Docker Compose stack containing Pangolin, Gerbil, and Traefik onto a VPS hosted on a cloud platform like Amazon EC2, DigitalOcean Droplet, or similar. There are many VPS hosting options available to suit your needs.

2. **Domain Configuration**:  
   Point your domain name to the VPS and configure Pangolin with your preferred settings.

3. **Connect Private Sites**:

    - Install Newt or use another WireGuard client on private sites.
    - Establish a connection from these sites to the central server.
    - This approach allows you to securely expose resources even in environments where the ISP prevents port forwarding.

4. **Use Case Example - Bypassing Port Restrictions**:  
   Imagine private sites where the ISP restricts port forwarding. By connecting these sites to Pangolin via WireGuard, you can securely expose HTTP and HTTPS resources on the private network without any networking complexity.

5. **Use Case Example - IoT Networks**:  
   IoT networks are often fragmented and difficult to manage. By deploying Pangolin on a central server, you can connect all your IoT sites via Newt or another WireGuard client. This creates a simple, secure, and centralized way to access IoT resources without the need for intricate networking setups.

---

## Similar Projects and Inspirations

Pangolin was inspired by several existing projects and concepts:

-   **Cloudflare Tunnels**:  
    A similar approach to proxying private resources securely, but Pangolin is a self-hosted alternative, giving you full control over your infrastructure.

-   **Authentic and Authelia**:  
    These projects inspired Pangolin’s centralized authentication system for proxies, enabling robust user and role management.

---

## Screenshots

Here are some examples of Pangolin in action:

<div align="center">
  <table>
    <tr>
      <td align="center"><img src="public/screenshots/auth.png" alt="Authentication Example" width="200"/></td>
      <td align="center"><img src="public/screenshots/connectivity.png" alt="Connectivity Example" width="200"/></td>
      <td align="center"><img src="public/screenshots/share-link.png" alt="Share Link Example" width="200"/></td>
    </tr>
    <tr>
      <td align="center"><b>Authentication</b></td>
      <td align="center"><b>Connectivity</b></td>
      <td align="center"><b>Share Link</b></td>
    </tr>
    <tr>
      <td align="center"><img src="public/screenshots/sites.png" alt="Sites Example" width="200"/></td>
      <td align="center"><img src="public/screenshots/users.png" alt="Users Example" width="200"/></td>
    </tr>
    <tr>
      <td align="center"><b>Sites</b></td>
      <td align="center"><b>Users</b></td>
    </tr>
  </table>
</div>

---

## Technical Setup

### Components Overview

Pangolin’s architecture consists of the following components, each designed to handle a specific aspect of the system:

1. **Pangolin** (Management Application & Central Server):  
   The central hub for managing users, roles, organizations, and resources. Pangolin handles authentication, access control, and API management.

2. [**Gerbil**](https://github.com/fosrl/gerbil) (WireGuard Interface Management):  
   Acts as the intermediary for managing WireGuard configurations. It creates and maintains the secure tunnels between sites and the Pangolin server.

3. [**Traefik**](https://github.com/traefik/traefik) (Reverse Proxy):  
   A high-performance, modular reverse proxy that routes requests to private resources. Traefik is widely adopted, and its plugin system allows further customization and security enhancements. For example:

    - Out-of-the-box compatibility with plugins like Fail2Ban or CrowdSec.
    - Enhanced security via our custom Traefik plugin [**Badger**](https://github.com/fosrl/badger), which acts as an authentication bouncer.

4. [**Newt**](https://github.com/fosrl/newt) (Minimal WireGuard Client):  
   A lightweight client designed to run on the private network. Newt:
    - Connects to the Pangolin server via WebSocket for managing endpoints.
    - Facilitates networking through its connection to Gerbil over the encrypted tunnel.

---

## Licensing

Pangolin is released under the ... license. For inquiries about commercial licensing, please contact us.

## Contributions

Please see [CONTRIBUTIONS](./CONTRIBUTIONS.md) in the repository for guidelines and best practices.

