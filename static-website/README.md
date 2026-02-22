# TON AI Agent - Static Website

A production-ready, fully static marketing website for TON AI Agent that can be deployed on any hosting without Node.js or build tools.

## Features

- **Pure Static HTML/CSS**: Works without JavaScript frameworks or build tools
- **Mobile-First Design**: Responsive design with adaptive breakpoints
- **Dark Mode Support**: Automatic dark mode via `prefers-color-scheme`
- **SEO Optimized**: Complete meta tags, OpenGraph, Schema.org structured data
- **Accessibility**: WCAG 2.1 compliant
- **Localization Ready**: Support for English, Russian, and Chinese
- **PHP Backend (Optional)**: Form handling for contact, newsletter, and institutional inquiries
- **Performance Optimized**: Lightweight, fast-loading pages

## Quick Start

### Option 1: Static Hosting (No PHP)

1. Upload all files to your web server
2. Point your domain to the directory
3. Done! No build process needed.

Works with:
- Nginx
- Apache
- Cloudflare Pages
- GitHub Pages
- Netlify
- Any static hosting

### Option 2: With PHP Backend

1. Upload all files to a PHP-enabled server
2. Copy `api/config.example.php` to `api/config.php`
3. Configure your email and API settings in `config.php`
4. Create a `logs/` directory with write permissions
5. Done!

## Directory Structure

```
static-website/
├── css/
│   ├── design-system.css    # Design tokens, variables, utilities
│   ├── components.css       # UI component styles
│   ├── animations.css       # CSS animations
│   └── main.css             # Main stylesheet (imports others)
├── js/
│   └── i18n.js              # Internationalization module
├── images/
│   └── favicon.svg          # TON logo favicon
├── api/                     # PHP backend (optional)
│   ├── config.example.php   # Configuration template
│   ├── subscribe.php        # Newsletter subscription
│   ├── contact.php          # Contact form handler
│   └── institutional.php    # Institutional inquiry handler
├── product/                 # Product pages
├── developers/              # Developer documentation
├── institutional/           # Institutional solutions
├── token/                   # TONAI token information
├── ecosystem/               # Ecosystem pages
├── resources/               # Blog, research, case studies
├── company/                 # About, careers, contact
├── security/                # Security documentation
├── legal/                   # Terms, privacy, disclaimers
├── en/, ru/, zh/            # Localized versions
└── index.html               # Homepage
```

## Design System

### Colors

| Variable | Light Mode | Dark Mode | Usage |
|----------|-----------|-----------|-------|
| `--ton-blue` | #0088CC | #0088CC | Primary brand color |
| `--vibrant-cyan` | #00D4FF | #00D4FF | Accent color |
| `--deep-navy` | #1A1A2E | #1A1A2E | Dark backgrounds |
| `--background` | #FFFFFF | #0F0F1A | Page background |
| `--foreground` | #0F172A | #F8FAFC | Text color |

### Typography

- **Headings**: Inter (600-700 weight)
- **Body**: Inter (400-500 weight)
- **Code**: JetBrains Mono

### Components

All components are documented in `css/components.css`:

- Buttons (`.btn`, `.btn-primary`, `.btn-outline`, etc.)
- Cards (`.card`, `.card-hover`, `.feature-card`)
- Forms (`.form-input`, `.form-select`, `.form-textarea`)
- Badges (`.badge`, `.badge-primary`, `.badge-success`)
- Navigation (`.nav-link`, `.dropdown`)
- And more...

## Customization

### Adding New Pages

1. Copy an existing page as a template
2. Update the content
3. Ensure header and footer are included
4. Add proper meta tags for SEO

### Modifying Styles

Edit the CSS files in the `css/` directory:

- `design-system.css` - Change colors, typography, spacing
- `components.css` - Modify component styles
- `animations.css` - Add or edit animations
- `main.css` - Page-specific styles

### Localization

1. Add translations to `js/i18n.js`
2. Use `data-i18n="key"` attributes on elements
3. Language is auto-detected or can be set via URL parameter (`?lang=ru`)

## PHP Backend Configuration

### Email Settings

```php
'email' => [
    'admin_email' => 'your@email.com',
    'from_email' => 'noreply@yourdomain.com',
    'smtp_enabled' => true,  // Recommended for production
    'smtp_host' => 'smtp.provider.com',
    'smtp_port' => 587,
    'smtp_user' => 'username',
    'smtp_pass' => 'password',
],
```

### reCAPTCHA (Recommended)

1. Get keys from [Google reCAPTCHA](https://www.google.com/recaptcha/)
2. Add to config:

```php
'recaptcha' => [
    'enabled' => true,
    'site_key' => 'your_site_key',
    'secret_key' => 'your_secret_key',
],
```

### HubSpot Integration

```php
'hubspot' => [
    'enabled' => true,
    'api_key' => 'your_hubspot_api_key',
    'newsletter_list_id' => 'list_id',
],
```

## Performance Targets

- Lighthouse Score: > 95
- First Contentful Paint: < 1.5s
- Time to Interactive: < 3s
- Cumulative Layout Shift: < 0.1

## Browser Support

- Chrome (last 2 versions)
- Firefox (last 2 versions)
- Safari (last 2 versions)
- Edge (last 2 versions)
- Mobile browsers (iOS Safari, Chrome for Android)

## Deployment Checklist

- [ ] Update meta tags with your domain
- [ ] Configure PHP backend (if using)
- [ ] Set up SSL certificate
- [ ] Configure analytics (PostHog, Google Analytics)
- [ ] Test all forms
- [ ] Verify mobile responsiveness
- [ ] Check accessibility
- [ ] Submit sitemap to search engines

## License

MIT License - TON AI Agent Team

## Support

- Website: https://tonaiagent.com
- Telegram: https://t.me/tonaiagent
- GitHub: https://github.com/xlabtg/TONAIAgent
