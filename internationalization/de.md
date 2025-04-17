## Authentication Site

| EN                                                       | DE                                                                                 | Notes      |
| -------------------------------------------------------- | ---------------------------------------------------------------------------------- | ---------- |
| Powered by [Pangolin](https://github.com/fosrl/pangolin) | Bereitgestellt von [Pangolin](https://github.com/fosrl/pangolin)                   |            |
| Authentication Required                                  | Authentifizierung erforderlich                                                     |            |
| Choose your preferred method to access {resource}        | Wählen Sie Ihre bevorzugte Methode, um auf {resource} zuzugreifen                  |            |
| PIN                                                      | PIN                                                                                |            |
| User                                                     | Benutzer                                                                           |            |
| 6-digit PIN Code                                         | 6-stelliger PIN-Code                                                               | pin login  |
| Login in with PIN                                        | Mit PIN anmelden                                                                   | pin login  |
| Email                                                    | E-Mail                                                                             | user login |
| Enter your email                                         | Geben Sie Ihre E-Mail-Adresse ein                                                  | user login |
| Password                                                 | Passwort                                                                           | user login |
| Enter your password                                      | Geben Sie Ihr Passwort ein                                                         | user login |
| Forgot your password?                                    | Passwort vergessen?                                                                | user login |
| Log in                                                   | Anmelden                                                                           | user login |

---

## Login site

| EN                    | DE                                 | Notes       |
| --------------------- | ---------------------------------- | ----------- |
| Welcome to Pangolin   | Willkommen bei Pangolin            |             |
| Log in to get started | Melden Sie sich an, um zu beginnen |             |
| Email                 | E-Mail                             |             |
| Enter your email      | Geben Sie Ihre E-Mail-Adresse ein  | placeholder |
| Password              | Passwort                           |             |
| Enter your password   | Geben Sie Ihr Passwort ein         | placeholder |
| Forgot your password? | Passwort vergessen?                |             |
| Log in                | Anmelden                           |             |

# Ogranization site after successful login

| EN                                        | DE                                           | Notes |
| ----------------------------------------- | -------------------------------------------- | ----- |
| Welcome to Pangolin                       | Willkommen bei Pangolin                      |       |
| You're a member of {number} organization. | Sie sind Mitglied von {number} Organisation. |       |

## Shared Header, Navbar and Footer
##### Header

| EN                  | DE                  | Notes |
| ------------------- | ------------------- | ----- |
| Documentation       | Dokumentation       |       |
| Support             | Support             |       |
| Organization {name} | Organisation {name} |       |
##### Organization selector

| EN               | DE                | Notes |
| ---------------- | ----------------- | ----- |
| Search…          | Suchen…           |       |
| Create           | Erstellen         |       |
| New Organization | Neue Organisation |       |
| Organizations    | Organisationen    |       |

##### Navbar

| EN              | DE                | Notes |
| --------------- | ----------------- | ----- |
| Sites           | Websites          |       |
| Resources       | Ressourcen        |       |
| User & Roles    | Benutzer & Rollen |       |
| Shareable Links | Teilbare Links    |       |
| General         | Allgemein         |       |
##### Footer
| EN                        | DE                          |                     |
| ------------------------- | --------------------------- | ------------------- |
| Page {number} of {number} | Seite {number} von {number} |                     |
| Rows per page             | Zeilen pro Seite            |                     |
| Pangolin                  | Pangolin                    | unten auf der Seite |
| Built by Fossorial        | Erstellt von Fossorial      | unten auf der Seite |
| Open Source               | Open Source                 | unten auf der Seite |
| Documentation             | Dokumentation               | unten auf der Seite |
| {version}                 | {version}                   | unten auf der Seite |

## Main “Sites”
##### “Hero” section

| EN                                                           | DE                                                           | Notes |
| ------------------------------------------------------------ | ------------------------------------------------------------ | ----- |
| Newt (Recommended)                                           | Newt (empfohlen)                                             |       |
| For the best user experience, use Newt. It uses WireGuard under the hood and allows you to address your private resources by their LAN address on your private network from within the Pangolin dashboard. | Für das beste Benutzererlebnis verwenden Sie Newt. Es nutzt WireGuard im Hintergrund und ermöglicht es Ihnen, auf Ihre privaten Ressourcen über ihre LAN-Adresse in Ihrem privaten Netzwerk direkt aus dem Pangolin-Dashboard zuzugreifen. |       |
| Runs in Docker                                               | Läuft in Docker                                              |       |
| Runs in shell on macOS, Linux, and Windows                   | Läuft in der Shell auf macOS, Linux und Windows              |       |
| Install Newt                                                 | Newt installieren                                            |       |
| Basic WireGuard<br>                                          | Verwenden Sie einen beliebigen WireGuard-Client, um eine Verbindung herzustellen. Sie müssen auf Ihre internen Ressourcen über die Peer-IP-Adresse zugreifen. |       |
| Compatible with all WireGuard clients<br>                    | Kompatibel mit allen WireGuard-Clients<br>                   |       |
| Manual configuration required                                | Manuelle Konfiguration erforderlich<br>                      |       |
##### Content

| EN                                                        | DE                                                           | Notes                            |
| --------------------------------------------------------- | ------------------------------------------------------------ | -------------------------------- |
| Manage Sites                                              | Seiten verwalten                                             |                                  |
| Allow connectivity to your network through secure tunnels | Ermöglichen Sie die Verbindung zu Ihrem Netzwerk über ein sicheren Tunnel |                                  |
| Search sites                                              | Seiten suchen                                                | placeholder                      |
| Add Site                                                  | Seite hinzufügen                                             |                                  |
| Name                                                      | Name                                                         | table header                     |
| Online                                                    | Status                                                       | table header                     |
| Site                                                      | Seite                                                        | table header                     |
| Data In                                                   | Eingehende Daten                                             | table header                     |
| Data Out                                                  | Ausgehende Daten                                             | table header                     |
| Connection Type                                           | Verbindungstyp                                               | table header                     |
| Online                                                    | Online                                                       | site state                       |
| Offline                                                   | Offline                                                      | site state                       |
| Edit →                                                    | Bearbeiten →                                                 |                                  |
| View settings                                             | Einstellungen anzeigen                                       | Popup after clicking “…” on site |
| Delete                                                    | Löschen                                                      | Popup after clicking “…” on site |
##### Add Site Popup

| EN                                                     | DE                                                          | Notes       |
| ------------------------------------------------------ | ----------------------------------------------------------- | ----------- |
| Create Site                                            | Seite erstellen                                             |             |
| Create a new site to start connection for this site    | Erstellen Sie eine neue Seite, um die Verbindung zu starten |             |
| Name                                                   | Name                                                        |             |
| Site name                                              | Seiten-Name                                                 | placeholder |
| This is the name that will be displayed for this site. | So wird Ihre Seite angezeigt                                | desc        |
| Method                                                 | Methode                                                     |             |
| Local                                                  | Lokal                                                       |             |
| Newt                                                   | Newt                                                        |             |
| WireGuard                                              | WireGuard                                                   |             |
| This is how you will expose connections.               | So werden Verbindungen freigegeben.                         |             |
| You will only be able to see the configuration once.   | Diese Konfiguration können Sie nur einmal sehen.            |             |
| Learn how to install Newt on your system               | Erfahren Sie, wie Sie Newt auf Ihrem System installieren    |             |
| I have copied the config                               | Ich habe die Konfiguration kopiert                          |             |
| Create Site                                            | Website erstellen                                           |             |
| Close                                                  | Schließen                                                   |             |

## Main “Resources”

##### “Hero” section

| EN                                                           | DE                                                           | Notes |
| ------------------------------------------------------------ | ------------------------------------------------------------ | ----- |
| Resources                                                    | Ressourcen                                                   |       |
| Ressourcen sind Proxy-Server für Anwendungen, die in Ihrem privaten Netzwerk laufen. Erstellen Sie eine Ressource für jede HTTP- oder HTTPS-Anwendung in Ihrem privaten Netzwerk. Jede Ressource muss mit einer Website verbunden sein, um eine private und sichere Verbindung über den verschlüsselten WireGuard-Tunnel zu ermöglichen. | Ressourcen sind Proxy-Server für Anwendungen, die in Ihrem privaten Netzwerk laufen. Erstellen Sie eine Ressource für jede HTTP- oder HTTPS-Anwendung in Ihrem privaten Netzwerk. Jede Ressource muss mit einer Website verbunden sein, um eine private und sichere Verbindung über den verschlüsselten WireGuard-Tunnel zu ermöglichen. |       |
| Secure connectivity with WireGuard encryption                | Sichere Verbindung mit WireGuard-Verschlüsselung             |       |
| Configure multiple authentication methods                    | Konfigurieren Sie mehrere Authentifizierungsmethoden         |       |
| User and role-based access control                           | Benutzer- und rollenbasierte Zugriffskontrolle               |       |
##### Content

| EN                                                 | DE                                                         | Notes                |
| -------------------------------------------------- | ---------------------------------------------------------- | -------------------- |
| Manage Resources                                   | Ressourcen verwalten                                       |                      |
| Create secure proxies to your private applications | Erstellen Sie sichere Proxys für Ihre privaten Anwendungen |                      |
| Search resources                                   | Ressourcen durchsuchen                                     | placeholder          |
| Name                                               | Name                                                       |                      |
| Site                                               | Website                                                    |                      |
| Full URL                                           | Vollständige URL                                           |                      |
| Authentication                                     | Authentifizierung                                          |                      |
| Not Protected                                      | Nicht geschützt                                            | authentication state |
| Protected                                          | Geschützt                                                  | authentication state |
| Edit →                                             | Bearbeiten →                                               |                      |
| Add Resource                                       | Ressource hinzufügen                                       |                      |
##### Add Resource Popup

| EN                                                           | DE                                                           | Notes               |
| ------------------------------------------------------------ | ------------------------------------------------------------ | ------------------- |
| Create Resource                                              | Ressource erstellen                                          |                     |
| Create a new resource to proxy request to your app           | Erstellen Sie eine neue Ressource, um Anfragen an Ihre App zu proxen |                     |
| Name                                                         | Name                                                         |                     |
| My Resource                                                  | Neue Ressource                                               | name placeholder    |
| This is the name that will be displayed for this resource.   | Dies ist der Name, der für diese Ressource angezeigt wird    |                     |
| Subdomain                                                    | Subdomain                                                    |                     |
| Enter subdomain                                              | Subdomain eingeben                                           |                     |
| This is the fully qualified domain name that will be used to access the resource. | Dies ist der vollständige Domainname, der für den Zugriff auf die Ressource verwendet wird. |                     |
| Site                                                         | Website                                                      |                     |
| Search site…                                                 | Website suchen…                                              | Site selector popup |
| This is the site that will be used in the dashboard.         | Dies ist die Website, die im Dashboard verwendet wird.       |                     |
| Create Resource                                              | Ressource erstellen                                          |                     |
| Close                                                        | Schließen                                                    |                     |


## Main “User & Roles”
##### Content

| EN                                                           | DE                                                           | Notes                         |
| ------------------------------------------------------------ | ------------------------------------------------------------ | ----------------------------- |
| Manage User & Roles                                          | Benutzer & Rollen verwalten                                  |                               |
| Invite users and add them to roles to manage access to your organization | Laden Sie Benutzer ein und weisen Sie ihnen Rollen zu, um den Zugriff auf Ihre Organisation zu verwalten |                               |
| Users                                                        | Benutzer                                                     | sidebar item                  |
| Roles                                                        | Rollen                                                       | sidebar item                  |
| **User tab**                                                 |                                                              |                               |
| Search users                                                 | Benutzer suchen                                              | placeholder                   |
| Invite User                                                  | Benutzer einladen                                            | addbutton                     |
| Email                                                        | E-Mail                                                       | table header                  |
| Status                                                       | Status                                                       | table header                  |
| Role                                                         | Rolle                                                        | table header                  |
| Confirmed                                                    | Bestätigt                                                    | account status                |
| Not confirmed (?)                                            | Nicht bestätigt (?)                                          | unknown for me account status |
| Owner                                                        | Besitzer                                                     | role                          |
| Admin                                                        | Administrator                                                | role                          |
| Member                                                       | Mitglied                                                     | role                          |
| **Roles Tab**                                                |                                                              |                               |
| Search roles                                                 | Rollen suchen                                                | placeholder                   |
| Add Role                                                     | Rolle hinzufügen                                             | addbutton                     |
| Name                                                         | Name                                                         | table header                  |
| Description                                                  | Beschreibung                                                 | table header                  |
| Admin                                                        | Administrator                                                | role                          |
| Member                                                       | Mitglied                                                     | role                          |
| Admin role with the most permissions                         | Administratorrolle mit den meisten Berechtigungen            | admin role desc               |
| Members can only view resources                              | Mitglieder können nur Ressourcen anzeigen                    | member role desc              |

##### Invite User popup

| EN                | DE                                                      | Notes       |
| ----------------- | ------------------------------------------------------- | ----------- |
| Invite User       | Geben Sie neuen Benutzern Zugriff auf Ihre Organisation |             |
| Email             | E-Mail                                                  |             |
| Enter an email    | E-Mail eingeben                                         | placeholder |
| Role              | Rolle                                                   |             |
| Select role       | Rolle auswählen                                         | placeholder |
| Gültig für        | Gültig bis                                              |             |
| 1 day             | Tag                                                     |             |
| 2 days            | 2 Tage                                                  |             |
| 3 days            | 3 Tage                                                  |             |
| 4 days            | 4 Tage                                                  |             |
| 5 days            | 5 Tage                                                  |             |
| 6 days            | 6 Tage                                                  |             |
| 7 days            | 7 Tage                                                  |             |
| Create Invitation | Einladung erstellen                                     |             |
| Close             | Schließen                                               |             |


## Main “Shareable Links”
##### “Hero” section

| EN                                                           | DE                                                           | Notes |
| ------------------------------------------------------------ | ------------------------------------------------------------ | ----- |
| Shareable Links                                              | Teilbare Links                                               |       |
| Create shareable links to your resources. Links provide temporary or unlimited access to your resource. You can configure the expiration duration of the link when you create one. | Erstellen Sie teilbare Links zu Ihren Ressourcen. Links bieten temporären oder unbegrenzten Zugriff auf Ihre Ressource. Sie können die Gültigkeitsdauer des Links beim Erstellen konfigurieren. |       |
| Easy to create and share                                     | Einfach zu erstellen und zu teilen                           |       |
| Configurable expiration duration                             | Konfigurierbare Gültigkeitsdauer                             |       |
| Secure and revocable                                         | Sicher und widerrufbar                                       |       |
##### Content

| EN                                                           | DE                                                           | Notes             |
| ------------------------------------------------------------ | ------------------------------------------------------------ | ----------------- |
| Manage Shareable Links                                       | Teilbare Links verwalten                                     |                   |
| Create shareable links to grant temporary or permanent access to your resources | Erstellen Sie teilbare Links, um temporären oder permanenten Zugriff auf Ihre Ressourcen zu gewähren |                   |
| Search links                                                 | Links suchen                                                 | placeholder       |
| Create Share Link                                            | Neuen Link erstellen                                         | addbutton         |
| Resource                                                     | Ressource                                                    | table header      |
| Title                                                        | Titel                                                        | table header      |
| Created                                                      | Erstellt                                                     | table header      |
| Expires                                                      | Gültig bis                                                   | table header      |
| No links. Create one to get started.                         | Keine Links. Erstellen Sie einen, um zu beginnen.            | table placeholder |

##### Create Shareable Link popup

| EN                                                           | DE                                                           | Notes                   |
| ------------------------------------------------------------ | ------------------------------------------------------------ | ----------------------- |
| Create Shareable Link                                        | Teilbaren Link erstellen                                     |                         |
| Anyone with this link can access the resource                | Jeder mit diesem Link kann auf die Ressource zugreifen       |                         |
| Resource                                                     | Ressource                                                    |                         |
| Select resource                                              | Ressource auswählen                                          |                         |
| Search resources…                                            | Ressourcen suchen…                                           | resource selector popup |
| Title (optional)                                             | Titel (optional)                                             |                         |
| Enter title                                                  | Titel eingeben                                               | placeholder             |
| Expire in                                                    | Gültig bis                                                   |                         |
| Minutes                                                      | Minuten                                                      |                         |
| Hours                                                        | Stunden                                                      |                         |
| Days                                                         | Tage                                                         |                         |
| Months                                                       | Monate                                                       |                         |
| Years                                                        | Jahre                                                        |                         |
| Never expire                                                 | Nie ablaufen                                                 |                         |
| Expiration time is how long the link will be usable and provide access to the resource. After this time, the link will no longer work, and users who used this link will lose access to the resource. | Die Gültigkeitsdauer bestimmt, wie lange der Link nutzbar ist und Zugriff auf die Ressource bietet. Nach Ablauf dieser Zeit funktioniert der Link nicht mehr, und Benutzer, die diesen Link verwendet haben, verlieren den Zugriff auf die Ressource. |                         |
| Create Link                                                  | Link erstellen                                               |                         |
| Close                                                        | Schließen                                                    |                         |


## Main “General”

| EN                                                           | DE                                                           | Notes        |
| ------------------------------------------------------------ | ------------------------------------------------------------ | ------------ |
| General                                                      | Allgemein                                                    |              |
| Configure your organization’s general settings               | Konfigurieren Sie die allgemeinen Einstellungen Ihrer Organisation |              |
| General                                                      | Allgemein                                                    | sidebar item |
| Organization Settings                                        | Organisationseinstellungen                                   |              |
| Manage your organization details and configuration           | Verwalten Sie die Details und Konfiguration Ihrer Organisation |              |
| Name                                                         | Name                                                         |              |
| This is the display name of the org                          | Dies ist der Anzeigename Ihrer Organisation                  |              |
| Save Settings                                                | Einstellungen speichern                                      |              |
| Danger Zone                                                  | Gefahrenzone                                                 |              |
| Once you delete this org, there is no going back. Please be certain. | Wenn Sie diese Organisation löschen, gibt es kein Zurück. Bitte seien Sie sicher. |              |
| Delete Organization Data                                     | Organisationsdaten löschen                                   |              |