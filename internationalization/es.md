## Authentication Site


| EN                                                       | ES                                                           | Notes      |
| -------------------------------------------------------- | ------------------------------------------------------------ | ---------- |
| Powered by [Pangolin](https://github.com/fosrl/pangolin) | Desarrollado por [Pangolin](https://github.com/fosrl/pangolin)  |            |
| Authentication Required                                  | Se requiere autenticación                                    |            |
| Choose your preferred method to access {resource}        | Elije tu método requerido para acceder a {resource}          |            |
| PIN                                                      | PIN                                                          |            |
| User                                                     | Usuario                                                      |            |
| 6-digit PIN Code                                         | Código PIN de 6 dígitos                                      | pin login  |
| Login in with PIN                                        | Registrate con PIN                                           | pin login  |
| Email                                                    | Email                                                        | user login |
| Enter your email                                         | Introduce tu email                                           | user login |
| Password                                                 | Contraseña                                                   | user login |
| Enter your password                                      | Introduce tu contraseña                                      | user login |
| Forgot your password?                                    | ¿Olvidaste tu contraseña?                                    | user login |
| Log in                                                   | Iniciar sesión                                               | user login |


## Login site

| EN                    | ES                                 | Notes       |
| --------------------- | ---------------------------------- | ----------- |
| Welcome to Pangolin   | Binvenido a Pangolin               |             |
| Log in to get started | Registrate para comenzar           |             |
| Email                 | Email                              |             |
| Enter your email      | Introduce tu email                 | placeholder |
| Password              | Contraseña                         |             |
| Enter your password   | Introduce tu contraseña            | placeholder |
| Forgot your password? | ¿Olvidaste tu contraseña?          |             |
| Log in                | Iniciar sesión                     |             |

# Ogranization site after successful login

| EN                                        | ES                                           | Notes |
| ----------------------------------------- | -------------------------------------------- | ----- |
| Welcome to Pangolin                       | Binvenido a Pangolin                         |       |
| You're a member of {number} organization. | Eres miembro de la organización {number}.    |       |

## Shared Header, Navbar and Footer
##### Header

| EN                  | ES                  | Notes |
| ------------------- | ------------------- | ----- |
| Documentation       | Documentación       |       |
| Support             | Soporte             |       |
| Organization {name} | Organización {name} |       |
##### Organization selector

| EN               | ES                | Notes |
| ---------------- | ----------------- | ----- |
| Search…          | Buscar…           |       |
| Create           | Crear             |       |
| New Organization | Nueva Organización|       |
| Organizations    | Organizaciones    |       |

##### Navbar

| EN              | ES                     | Notes |
| --------------- | -----------------------| ----- |
| Sites           | Sitios                 |       |
| Resources       | Recursos               |       |
| User & Roles    | Usuarios y roles       |       |
| Shareable Links | Enlaces para compartir |       |
| General         | General                |       |

##### Footer
| EN                        | ES                          |                             |
| ------------------------- | --------------------------- | -------|
| Page {number} of {number} | Página {number} de {number} | footer |        
| Rows per page             | Filas por página            | footer |
| Pangolin                  | Pangolin                    | footer |
| Built by Fossorial        | Construido por Fossorial    | footer |
| Open Source               | Código abierto              | footer |
| Documentation             | Documentación               | footer |
| {version}                 | {version}                   | footer |

## Main “Sites”
##### “Hero” section

| EN                                                           | ES                                                           | Notes |
| ------------------------------------------------------------ | ------------------------------------------------------------ | ----- |
| Newt (Recommended)                                           | Newt (Recomendado)                                           |       |
| For the best user experience, use Newt. It uses WireGuard under the hood and allows you to address your private resources by their LAN address on your private network from within the Pangolin dashboard. | Para obtener la mejor experiencia de usuario, utiliza Newt. Utiliza WireGuard internamente y te permite abordar tus recursos privados mediante tu dirección LAN en tu red privada desde el panel de Pangolin. |       |
| Runs in Docker                                               | Se ejecuta en Docker                                         |       |
| Runs in shell on macOS, Linux, and Windows                   | Se ejecuta en shell en macOS, Linux y Windows                |       |
| Install Newt                                                 | Instalar Newt                                                |       |
| Basic WireGuard<br>                                          | WireGuard básico<br>                                         |       | 
| Compatible with all WireGuard clients<br>                    | Compatible con todos los clientes WireGuard<br>              |       |
| Manual configuration required                                | Se requiere configuración manual                             |       |

##### Content

| EN                                                        | ES                                                           | Notes                            |
| --------------------------------------------------------- | ------------------------------------------------------------ | -------------------------------- |
| Manage Sites                                              | Administrar sitios                                           |                                  |
| Allow connectivity to your network through secure tunnels | Permitir la conectividad a tu red a través de túneles seguros|                                  |
| Search sites                                              | Buscar sitios                                                | placeholder                      |
| Add Site                                                  | Agregar sitio                                                |                                  |
| Name                                                      | Nombre                                                       | table header                     |
| Online                                                    | Conectado                                                    | table header                     |
| Site                                                      | Sitio                                                        | table header                     |
| Data In                                                   | Datos en                                                     | table header                     |
| Data Out                                                  | Datos de salida                                              | table header                     |
| Connection Type                                           | Tipo de conexión                                             | table header                     |
| Online                                                    | Conectado                                                    | site state                       |
| Offline                                                   | Desconectado                                                 | site state                       |
| Edit →                                                    | Editar →                                                     |                                  |
| View settings                                             | Ver configuración                                            | Popup after clicking “…” on site |
| Delete                                                    | Borrar                                                       | Popup after clicking “…” on site |

##### Add Site Popup

| EN                                                     | ES                                                          | Notes       |
| ------------------------------------------------------ | ----------------------------------------------------------- | ----------- |
| Create Site                                            | Crear sitio                                                 |             |
| Create a new site to start connection for this site    | Crear un nuevo sitio para iniciar la conexión para este sitio |             |
| Name                                                   | Nombre                                                      |             |
| Site name                                              | Nombre del sitio                                            | placeholder |
| This is the name that will be displayed for this site. | Este es el nombre que se mostrará para este sitio.          | desc        |
| Method                                                 | Método                                                      |             |
| Local                                                  | Local                                                       |             |
| Newt                                                   | Newt                                                        |             |
| WireGuard                                              | WireGuard                                                   |             |
| This is how you will expose connections.               | Así es como expondrás las conexiones.                       |             |
| You will only be able to see the configuration once.   | Solo podrás ver la configuración una vez.                   |             |
| Learn how to install Newt on your system               | Aprende a instalar Newt en tu sistema                       |             |
| I have copied the config                               | He copiado la configuración                                 |             |
| Create Site                                            | Crear sitio                                                 |             |
| Close                                                  | Cerrar                                                      |             |

## Main “Resources”

##### “Hero” section

| EN                                                           | ES                                                           | Notes |
| ------------------------------------------------------------ | ------------------------------------------------------------ | ----- |
| Resources                                                    | Recursos                                                     |       |
| Ressourcen sind Proxy-Server für Anwendungen, die in Ihrem privaten Netzwerk laufen. Erstellen Sie eine Ressource für jede HTTP- oder HTTPS-Anwendung in Ihrem privaten Netzwerk. Jede Ressource muss mit einer Website verbunden sein, um eine private und sichere Verbindung über den verschlüsselten WireGuard-Tunnel zu ermöglichen. |Los recursos son servidores proxy para aplicaciones que se ejecutan en su red privada. Cree un recurso para cada aplicación HTTP o HTTPS en su red privada. Cada recurso debe estar conectado a un sitio web para proporcionar una conexión privada y segura a través del túnel cifrado WireGuard. |       |
| Secure connectivity with WireGuard encryption                | Conectividad segura con encriptación WireGuard               |       |
| Configure multiple authentication methods                    | Configura múltiples métodos de autenticación                 |       |
| User and role-based access control                           | Control de acceso basado en usuarios y roles                 |       |

##### Content

| EN                                                 | ES                                                         | Notes                |
| -------------------------------------------------- | ---------------------------------------------------------- | -------------------- |
| Manage Resources                                   | Administrar recursos                                       |                      |
| Create secure proxies to your private applications | Crea servidores proxy seguros para tus aplicaciones privadas |                      |
| Search resources                                   | Buscar recursos                                            | placeholder          |
| Name                                               | Nombre                                                     |                      |
| Site                                               | Sitio                                                      |                      |
| Full URL                                           | URL completa                                               |                      |
| Authentication                                     | Autenticación                                              |                      |
| Not Protected                                      | No protegido                                               | authentication state |
| Protected                                          | Protegido                                                  | authentication state |
| Edit →                                             | Editar →                                                   |                      |
| Add Resource                                       | Agregar recurso                                            |                      |

##### Add Resource Popup

| EN                                                           | ES                                                           | Notes               |
| ------------------------------------------------------------ | ------------------------------------------------------------ | ------------------- |
| Create Resource                                              | Crear recurso                                                |                     |
| Create a new resource to proxy request to your app           | Crea un nuevo recurso para enviar solicitudes a tu aplicación |                     |
| Name                                                         | Nombre                                                        |                     |
| My Resource                                                  | Mi recurso                                                    | name placeholder    |
| This is the name that will be displayed for this resource.   | Este es el nombre que se mostrará para este recurso.         |                     |
| Subdomain                                                    | Subdominio                                                    |                     |
| Enter subdomain                                              | Ingresar subdominio                                           |                     |
| This is the fully qualified domain name that will be used to access the resource. | Este es el nombre de dominio completo que se utilizará para acceder al recurso. |                     |
| Site                                                         | Sitio                                                        |                     |
| Search site…                                                 | Buscar sitio…                                                | Site selector popup |
| This is the site that will be used in the dashboard.         | Este es el sitio que se utilizará en el panel de control.    |                     |
| Create Resource                                              | Crear recurso                                                |                     |
| Close                                                        | Cerrar                                                       |                     |

## Main “User & Roles”
##### Content

| EN                                                           | ES                                                           | Notes                         |
| ------------------------------------------------------------ | ------------------------------------------------------------ | ----------------------------- |
| Manage User & Roles                                          | Administrar usuarios y roles                                 |                               |
| Invite users and add them to roles to manage access to your organization | Invita a usuarios y agrégalos a roles para administrar el acceso a tu organización |                               |
| Users                                                        | Usuarios                                                     | sidebar item                  |
| Roles                                                        | Roles                                                        | sidebar item                  |
| **User tab**                                                 | **Pestaña de usuario**                                                            |                               |
| Search users                                                 | Buscar usuarios                                              | placeholder                   |
| Invite User                                                  | Invitar usuario                                           | addbutton                     |
| Email                                                        | Email                                                       | table header                  |
| Status                                                       | Estado                                                       | table header                  |
| Role                                                         | Role                                                         | table header                  |
| Confirmed                                                    | Confirmado                                                   | account status                |
| Not confirmed (?)                                            | No confirmado (?)                                            | unknown for me account status |
| Owner                                                        | Dueño                                                        | role                          |
| Admin                                                        | Administrador                                                | role                          |
| Member                                                       | Miembro                                                      | role                          |
| **Roles Tab**                                                | **Pestaña Roles**                                            |                               |
| Search roles                                                 | Buscar roles                                                 | placeholder                   |
| Add Role                                                     | Agregar rol                                                  | addbutton                     |
| Name                                                         | Nombre                                                       | table header                  |
| Description                                                  | Descripción                                                  | table header                  |
| Admin                                                        | Administrador                                                | role                          |
| Member                                                       | Miembro                                                      | role                          |
| Admin role with the most permissions                         | Rol de administrador con más permisos                        | admin role desc               |
| Members can only view resources                              | Los miembros sólo pueden ver los recursos                    | member role desc              |

##### Invite User popup

| EN                | ES                                                      | Notes       |
| ----------------- | ------------------------------------------------------- | ----------- |
| Invite User       | Invitar usuario                                         |             |
| Email             | Email                                                   |             |
| Enter an email    | Introduzca un email                                     | placeholder |
| Role              | Rol                                                     |             |
| Select role       | Seleccionar rol                                         | placeholder |
| Gültig für        | Válido para                                             |             |
| 1 day             | 1 día                                                   |             |
| 2 days            | 2 días                                                  |             |
| 3 days            | 3 días                                                  |             |
| 4 days            | 4 días                                                  |             |
| 5 days            | 5 días                                                  |             |
| 6 days            | 6 días                                                  |             |
| 7 days            | 7 días                                                  |             |
| Create Invitation | Crear invitación                                        |             |
| Close             | Cerrar                                                  |             |


## Main “Shareable Links”
##### “Hero” section

| EN                                                           | ES                                                           | Notes |
| ------------------------------------------------------------ | ------------------------------------------------------------ | ----- |
| Shareable Links                                              | Enlaces para compartir                                       |       |
| Create shareable links to your resources. Links provide temporary or unlimited access to your resource. You can configure the expiration duration of the link when you create one. | Crear enlaces que se puedan compartir a tus recursos. Los enlaces proporcionan acceso temporal o ilimitado a tu recurso. Puedes configurar la duración de caducidad del enlace cuando lo creas.                                |       |
| Easy to create and share                                     | Fácil de crear y compartir                                   |       |
| Configurable expiration duration                             | Duración de expiración configurable                          |       |
| Secure and revocable                                         | Seguro y revocable                                           |       |
##### Content

| EN                                                           | ES                                                           | Notes             |
| ------------------------------------------------------------ | ------------------------------------------------------------ | ----------------- |
| Manage Shareable Links                                       | Administrar enlaces compartibles                             |                   |
| Create shareable links to grant temporary or permanent access to your resources | Crear enlaces compartibles para otorgar acceso temporal o permanente a tus recursos |                   |
| Search links                                                 | Buscar enlaces                                               | placeholder       |
| Create Share Link                                            | Crear enlace para compartir                                  | addbutton         |
| Resource                                                     | Recurso                                                      | table header      |
| Title                                                        | Título                                                       | table header      |
| Created                                                      | Creado                                                       | table header      |
| Expires                                                      | Caduca                                                       | table header      |
| No links. Create one to get started.                         | No hay enlaces. Crea uno para comenzar.                      | table placeholder |

##### Create Shareable Link popup

| EN                                                           | ES                                                           | Notes                   |
| ------------------------------------------------------------ | ------------------------------------------------------------ | ----------------------- |
| Create Shareable Link                                        | Crear un enlace para compartir                               |                         |
| Anyone with this link can access the resource                | Cualquier persona con este enlace puede acceder al recurso.  |                         |
| Resource                                                     | Recurso                                                      |                         |
| Select resource                                              | Seleccionar recurso                                          |                         |
| Search resources…                                            | Buscar recursos…                                             | resource selector popup |
| Title (optional)                                             | Título (opcional)                                            |                         |
| Enter title                                                  | Introducir título                                            | placeholder             |
| Expire in                                                    | Caduca en                                                    |                         |
| Minutes                                                      | Minutos                                                      |                         |
| Hours                                                        | Horas                                                        |                         |
| Days                                                         | Días                                                         |                         |
| Months                                                       | Meses                                                        |                         |
| Years                                                        | Años                                                         |                         |
| Never expire                                                 | Nunca caduca                                                 |                         |
| Expiration time is how long the link will be usable and provide access to the resource. After this time, the link will no longer work, and users who used this link will lose access to the resource. | El tiempo de expiración es el tiempo durante el cual el enlace se podrá utilizar y brindará acceso al recurso. Después de este tiempo, el enlace dejará de funcionar y los usuarios que lo hayan utilizado perderán el acceso al recurso. |                         |
| Create Link                                                  | Crear enlace                                                |                         |
| Close                                                        | Cerrar                                                      |                         |


## Main “General”

| EN                                                           | ES                                                           | Notes        |
| ------------------------------------------------------------ | ------------------------------------------------------------ | ------------ |
| General                                                      | General                                                      |              |
| Configure your organization’s general settings               | Configura los ajustes generales de tu organización           |              |
| General                                                      | General                                                      | sidebar item |
| Organization Settings                                        | Configuración de la organización                             |              |
| Manage your organization details and configuration           | Administra los detalles y la configuración de tu organización|              |
| Name                                                         | Nombre                                                       |              |
| This is the display name of the org                          | Este es el nombre para mostrar de la organización.           |              |
| Save Settings                                                | Guardar configuración                                        |              |
| Danger Zone                                                  | Zona de peligro                                              |              |
| Once you delete this org, there is no going back. Please be certain. | Una vez que elimines esta organización, no habrá vuelta atrás. Asegúrate de hacerlo. |              |
| Delete Organization Data                                     | Eliminar datos de la organización                             |              |