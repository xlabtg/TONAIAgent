/**
 * TON AI Agent - Internationalization (i18n) Module
 *
 * A lightweight, vanilla JavaScript internationalization system.
 * Supports English (en), Russian (ru), and Chinese (zh).
 *
 * Usage:
 * 1. Add data-i18n="key" attributes to HTML elements
 * 2. Call i18n.init() on page load
 * 3. Use i18n.setLanguage('ru') to switch languages
 */

const i18n = (function() {
  // Default language
  let currentLang = 'en';

  // Translations
  const translations = {
    en: {
      // Navigation
      'nav.product': 'Product',
      'nav.developers': 'Developers',
      'nav.institutional': 'Institutional',
      'nav.ecosystem': 'Ecosystem',
      'nav.token': 'Token',
      'nav.resources': 'Resources',
      'nav.startBuilding': 'Start Building',
      'nav.launchApp': 'Launch App',

      // Hero Section
      'hero.badge': 'Powered by TON Blockchain',
      'hero.title1': 'Autonomous AI Agents',
      'hero.title2': 'for Finance on TON',
      'hero.subtitle': 'Deploy intelligent agents that trade, manage portfolios, and optimize yields 24/7 on The Open Network. Non-custodial, AI-powered, institutional-grade security.',
      'hero.cta.launch': 'Launch Agent',
      'hero.cta.build': 'Start Building',
      'hero.cta.demo': 'Watch Demo',
      'hero.trust.noCode': 'No code required',
      'hero.trust.nonCustodial': 'Non-custodial',
      'hero.trust.startTime': 'Start in 2 minutes',

      // Stats
      'stats.users': 'Active Users',
      'stats.assets': 'Assets Managed',
      'stats.strategies': 'Strategies Deployed',
      'stats.uptime': 'Uptime',

      // Value Proposition
      'value.title': 'Why TON AI Agent?',
      'value.subtitle': 'The most comprehensive platform for autonomous AI agents in DeFi. Built for retail traders, developers, and institutions.',

      // Features
      'feature.automation.title': '24/7 Automation',
      'feature.automation.desc': 'Agents never sleep. Execute strategies around the clock without manual intervention.',
      'feature.ai.title': 'Multi-AI Intelligence',
      'feature.ai.desc': 'Powered by Groq, Claude, GPT-4, and Gemini with smart routing and automatic failover.',
      'feature.security.title': 'Institutional Security',
      'feature.security.desc': 'MPC wallets, HSM integration, 8-layer authorization pipeline, and emergency controls.',
      'feature.marketplace.title': 'Strategy Marketplace',
      'feature.marketplace.desc': 'Discover and copy proven strategies from top performers.',
      'feature.telegram.title': 'Telegram Native',
      'feature.telegram.desc': 'Manage your agents directly from Telegram with Mini App integration.',
      'feature.copy.title': 'Copy & Earn',
      'feature.copy.desc': 'Copy top-performing strategies or monetize your own.',

      // How It Works
      'howItWorks.title': 'Launch Your First Agent in Minutes',
      'howItWorks.subtitle': 'From zero to autonomous trading in four simple steps. No coding required.',
      'howItWorks.step1.title': 'Connect Wallet',
      'howItWorks.step1.desc': 'Link TON Connect or create an MPC wallet. Secure, non-custodial, and instant setup.',
      'howItWorks.step2.title': 'Fund Your Agent',
      'howItWorks.step2.desc': 'Deposit TON or stablecoins to fund your agent operations.',
      'howItWorks.step3.title': 'Choose Strategy',
      'howItWorks.step3.desc': 'Select from the marketplace or build custom strategies with AI assistance.',
      'howItWorks.step4.title': 'Go Live 24/7',
      'howItWorks.step4.desc': 'Your agent executes automatically with full monitoring and risk controls.',
      'howItWorks.cta': 'Start Now - It\'s Free',

      // CTA Section
      'cta.title': 'Ready to Deploy Your First AI Agent?',
      'cta.subtitle': 'Join 10,000+ users automating their finances on TON.',
      'cta.sales': 'Talk to Sales',

      // Footer
      'footer.newsletter.title': 'Stay updated',
      'footer.newsletter.subtitle': 'Get the latest news, updates, and insights from TON AI Agent.',
      'footer.newsletter.placeholder': 'Enter your email',
      'footer.newsletter.button': 'Subscribe',
      'footer.copyright': 'All rights reserved.',
      'footer.powered': 'Built with precision for the TON Ecosystem. Powered by',
    },

    ru: {
      // Navigation
      'nav.product': 'Продукт',
      'nav.developers': 'Разработчикам',
      'nav.institutional': 'Институционалам',
      'nav.ecosystem': 'Экосистема',
      'nav.token': 'Токен',
      'nav.resources': 'Ресурсы',
      'nav.startBuilding': 'Начать разработку',
      'nav.launchApp': 'Запустить приложение',

      // Hero Section
      'hero.badge': 'На базе блокчейна TON',
      'hero.title1': 'Автономные ИИ-агенты',
      'hero.title2': 'для финансов на TON',
      'hero.subtitle': 'Разверните интеллектуальных агентов, которые торгуют, управляют портфелями и оптимизируют доходность 24/7 в The Open Network. Некастодиальный, на базе ИИ, институциональная безопасность.',
      'hero.cta.launch': 'Запустить агента',
      'hero.cta.build': 'Начать разработку',
      'hero.cta.demo': 'Смотреть демо',
      'hero.trust.noCode': 'Код не требуется',
      'hero.trust.nonCustodial': 'Некастодиальный',
      'hero.trust.startTime': 'Старт за 2 минуты',

      // Stats
      'stats.users': 'Активных пользователей',
      'stats.assets': 'Активов под управлением',
      'stats.strategies': 'Развёрнутых стратегий',
      'stats.uptime': 'Время работы',

      // Value Proposition
      'value.title': 'Почему TON AI Agent?',
      'value.subtitle': 'Самая комплексная платформа для автономных ИИ-агентов в DeFi. Создана для розничных трейдеров, разработчиков и институционалов.',

      // Features
      'feature.automation.title': 'Автоматизация 24/7',
      'feature.automation.desc': 'Агенты никогда не спят. Исполняйте стратегии круглосуточно без ручного вмешательства.',
      'feature.ai.title': 'Мульти-ИИ интеллект',
      'feature.ai.desc': 'На базе Groq, Claude, GPT-4 и Gemini с умной маршрутизацией и автоматическим переключением.',
      'feature.security.title': 'Институциональная безопасность',
      'feature.security.desc': 'MPC-кошельки, HSM-интеграция, 8-уровневая авторизация и экстренные контроли.',
      'feature.marketplace.title': 'Маркетплейс стратегий',
      'feature.marketplace.desc': 'Находите и копируйте проверенные стратегии от лучших трейдеров.',
      'feature.telegram.title': 'Нативный Telegram',
      'feature.telegram.desc': 'Управляйте агентами прямо из Telegram через Mini App.',
      'feature.copy.title': 'Копируй и зарабатывай',
      'feature.copy.desc': 'Копируйте лучшие стратегии или монетизируйте свои.',

      // How It Works
      'howItWorks.title': 'Запустите первого агента за минуты',
      'howItWorks.subtitle': 'От нуля до автономной торговли в четыре простых шага. Программирование не требуется.',
      'howItWorks.step1.title': 'Подключите кошелёк',
      'howItWorks.step1.desc': 'Свяжите TON Connect или создайте MPC-кошелёк. Безопасно и мгновенно.',
      'howItWorks.step2.title': 'Пополните агента',
      'howItWorks.step2.desc': 'Внесите TON или стейблкоины для операций агента.',
      'howItWorks.step3.title': 'Выберите стратегию',
      'howItWorks.step3.desc': 'Выберите из маркетплейса или создайте свою с помощью ИИ.',
      'howItWorks.step4.title': 'Запуск 24/7',
      'howItWorks.step4.desc': 'Агент работает автоматически с полным мониторингом и контролем рисков.',
      'howItWorks.cta': 'Начать сейчас - Бесплатно',

      // CTA Section
      'cta.title': 'Готовы запустить первого ИИ-агента?',
      'cta.subtitle': 'Присоединяйтесь к 10,000+ пользователей, автоматизирующих финансы на TON.',
      'cta.sales': 'Связаться с отделом продаж',

      // Footer
      'footer.newsletter.title': 'Будьте в курсе',
      'footer.newsletter.subtitle': 'Получайте последние новости и обновления от TON AI Agent.',
      'footer.newsletter.placeholder': 'Введите email',
      'footer.newsletter.button': 'Подписаться',
      'footer.copyright': 'Все права защищены.',
      'footer.powered': 'Создано для экосистемы TON. При поддержке',
    },

    zh: {
      // Navigation
      'nav.product': '产品',
      'nav.developers': '开发者',
      'nav.institutional': '机构',
      'nav.ecosystem': '生态系统',
      'nav.token': '代币',
      'nav.resources': '资源',
      'nav.startBuilding': '开始构建',
      'nav.launchApp': '启动应用',

      // Hero Section
      'hero.badge': '由 TON 区块链提供支持',
      'hero.title1': '自主 AI 代理',
      'hero.title2': 'TON 上的金融',
      'hero.subtitle': '部署智能代理，全天候在开放网络上进行交易、管理投资组合和优化收益。非托管、AI 驱动、机构级安全。',
      'hero.cta.launch': '启动代理',
      'hero.cta.build': '开始构建',
      'hero.cta.demo': '观看演示',
      'hero.trust.noCode': '无需代码',
      'hero.trust.nonCustodial': '非托管',
      'hero.trust.startTime': '2分钟内启动',

      // Stats
      'stats.users': '活跃用户',
      'stats.assets': '管理资产',
      'stats.strategies': '部署策略',
      'stats.uptime': '正常运行时间',

      // Value Proposition
      'value.title': '为什么选择 TON AI Agent？',
      'value.subtitle': 'DeFi 中最全面的自主 AI 代理平台。为零售交易者、开发者和机构打造。',

      // Features
      'feature.automation.title': '24/7 自动化',
      'feature.automation.desc': '代理永不休息。全天候执行策略，无需人工干预。',
      'feature.ai.title': '多 AI 智能',
      'feature.ai.desc': '由 Groq、Claude、GPT-4 和 Gemini 提供支持，具有智能路由和自动故障转移。',
      'feature.security.title': '机构级安全',
      'feature.security.desc': 'MPC 钱包、HSM 集成、8 层授权管道和紧急控制。',
      'feature.marketplace.title': '策略市场',
      'feature.marketplace.desc': '发现并复制顶级表现者的经过验证的策略。',
      'feature.telegram.title': 'Telegram 原生',
      'feature.telegram.desc': '直接从 Telegram 管理您的代理，集成 Mini App。',
      'feature.copy.title': '复制赚钱',
      'feature.copy.desc': '复制表现最佳的策略或将您的策略货币化。',

      // How It Works
      'howItWorks.title': '几分钟内启动您的第一个代理',
      'howItWorks.subtitle': '从零到自主交易只需四个简单步骤。无需编码。',
      'howItWorks.step1.title': '连接钱包',
      'howItWorks.step1.desc': '链接 TON Connect 或创建 MPC 钱包。安全、非托管、即时设置。',
      'howItWorks.step2.title': '为代理充值',
      'howItWorks.step2.desc': '存入 TON 或稳定币为您的代理操作提供资金。',
      'howItWorks.step3.title': '选择策略',
      'howItWorks.step3.desc': '从市场中选择或借助 AI 构建自定义策略。',
      'howItWorks.step4.title': '全天候运行',
      'howItWorks.step4.desc': '您的代理自动执行，具有完整的监控和风险控制。',
      'howItWorks.cta': '立即开始 - 免费',

      // CTA Section
      'cta.title': '准备好部署您的第一个 AI 代理了吗？',
      'cta.subtitle': '加入 10,000+ 在 TON 上自动化财务的用户。',
      'cta.sales': '联系销售',

      // Footer
      'footer.newsletter.title': '保持更新',
      'footer.newsletter.subtitle': '获取 TON AI Agent 的最新新闻、更新和见解。',
      'footer.newsletter.placeholder': '输入您的邮箱',
      'footer.newsletter.button': '订阅',
      'footer.copyright': '版权所有。',
      'footer.powered': '为 TON 生态系统精心打造。由以下支持',
    }
  };

  /**
   * Get translation for a key
   */
  function t(key, lang) {
    lang = lang || currentLang;
    const translation = translations[lang] && translations[lang][key];
    return translation || translations['en'][key] || key;
  }

  /**
   * Set the current language
   */
  function setLanguage(lang) {
    if (!translations[lang]) {
      console.warn('Language not supported:', lang);
      return;
    }

    currentLang = lang;
    localStorage.setItem('tonai-lang', lang);
    document.documentElement.setAttribute('lang', lang);

    // Update all elements with data-i18n attribute
    document.querySelectorAll('[data-i18n]').forEach(el => {
      const key = el.getAttribute('data-i18n');
      el.textContent = t(key);
    });

    // Update placeholders
    document.querySelectorAll('[data-i18n-placeholder]').forEach(el => {
      const key = el.getAttribute('data-i18n-placeholder');
      el.placeholder = t(key);
    });

    // Dispatch event for custom handling
    window.dispatchEvent(new CustomEvent('languageChanged', { detail: { lang } }));
  }

  /**
   * Get current language
   */
  function getLanguage() {
    return currentLang;
  }

  /**
   * Get available languages
   */
  function getLanguages() {
    return Object.keys(translations);
  }

  /**
   * Initialize i18n
   */
  function init() {
    // Try to get language from localStorage, URL, or browser
    const savedLang = localStorage.getItem('tonai-lang');
    const urlLang = new URLSearchParams(window.location.search).get('lang');
    const browserLang = navigator.language.split('-')[0];

    const lang = urlLang || savedLang || (translations[browserLang] ? browserLang : 'en');
    setLanguage(lang);
  }

  // Public API
  return {
    t,
    setLanguage,
    getLanguage,
    getLanguages,
    init
  };
})();

// Initialize on DOM ready
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', i18n.init);
} else {
  i18n.init();
}
