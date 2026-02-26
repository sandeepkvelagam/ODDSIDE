// Translations for Kvitt mobile app
// Supports: English, Spanish, French, German, Hindi, Portuguese, Chinese

export type Language = 
  | "en" 
  | "es" 
  | "fr" 
  | "de" 
  | "hi" 
  | "pt" 
  | "zh";

export const SUPPORTED_LANGUAGES: { code: Language; name: string; nativeName: string; flag: string }[] = [
  { code: "en", name: "English", nativeName: "English", flag: "🇺🇸" },
  { code: "es", name: "Spanish", nativeName: "Español", flag: "🇪🇸" },
  { code: "fr", name: "French", nativeName: "Français", flag: "🇫🇷" },
  { code: "de", name: "German", nativeName: "Deutsch", flag: "🇩🇪" },
  { code: "hi", name: "Hindi", nativeName: "हिन्दी", flag: "🇮🇳" },
  { code: "pt", name: "Portuguese", nativeName: "Português", flag: "🇧🇷" },
  { code: "zh", name: "Chinese", nativeName: "中文", flag: "🇨🇳" },
];

type TranslationKeys = {
  // Common
  common: {
    cancel: string;
    confirm: string;
    save: string;
    delete: string;
    edit: string;
    back: string;
    next: string;
    done: string;
    loading: string;
    error: string;
    success: string;
    retry: string;
    search: string;
    noResults: string;
  };
  
  // Navigation
  nav: {
    dashboard: string;
    groups: string;
    settings: string;
    profile: string;
    notifications: string;
    chats: string;
    games: string;
    wallet: string;
    aiAssistant: string;
    automations: string;
    settlements: string;
    requestPay: string;
  };
  
  // Dashboard
  dashboard: {
    welcome: string;
    recentGames: string;
    quickActions: string;
    noGames: string;
    viewAll: string;
    totalGames: string;
    netProfit: string;
    winRate: string;
  };
  
  // Groups
  groups: {
    myGroups: string;
    createGroup: string;
    joinGroup: string;
    noGroups: string;
    members: string;
    games: string;
    invite: string;
    leaveGroup: string;
    groupName: string;
  };
  
  // Game
  game: {
    startGame: string;
    endGame: string;
    buyIn: string;
    rebuy: string;
    cashOut: string;
    chips: string;
    pot: string;
    players: string;
    host: string;
    active: string;
    ended: string;
    settlement: string;
    owes: string;
    approve: string;
    reject: string;
  };
  
  // Settings
  settings: {
    title: string;
    appearance: string;
    language: string;
    notifications: string;
    privacy: string;
    hapticFeedback: string;
    voiceCommands: string;
    signOut: string;
    signOutConfirm: string;
    profile: string;
    billing: string;
    light: string;
    dark: string;
    system: string;
  };
  
  // Voice Commands
  voice: {
    title: string;
    listening: string;
    tapToSpeak: string;
    processing: string;
    commandRecognized: string;
    tryAgain: string;
    examples: string;
    buyInExample: string;
    rebuyExample: string;
    cashOutExample: string;
    helpExample: string;
  };
  
  // AI Assistant
  ai: {
    title: string;
    analyzing: string;
    suggestion: string;
    highPotential: string;
    mediumPotential: string;
    lowPotential: string;
    disclaimer: string;
  };
  
  // Auth
  auth: {
    signIn: string;
    signUp: string;
    email: string;
    password: string;
    forgotPassword: string;
    noAccount: string;
    hasAccount: string;
  };
};

const translations: Record<Language, TranslationKeys> = {
  en: {
    common: {
      cancel: "Cancel",
      confirm: "Confirm",
      save: "Save Changes",
      delete: "Delete",
      edit: "Update",
      back: "Back",
      next: "Next",
      done: "Done",
      loading: "Getting things ready\u2026",
      error: "Not available right now",
      success: "All set",
      retry: "Try Again",
      search: "Search",
      noResults: "No activity yet",
    },
    nav: {
      dashboard: "Overview",
      groups: "Groups",
      settings: "Preferences",
      profile: "Profile",
      notifications: "Alerts",
      chats: "Chats",
      games: "Games",
      wallet: "Wallet",
      aiAssistant: "AI Assistant",
      automations: "Smart Flows",
      settlements: "Settlements",
      requestPay: "Request & Pay",
    },
    dashboard: {
      welcome: "Welcome back",
      recentGames: "Recent Games",
      quickActions: "Quick Actions",
      noGames: "No games yet",
      viewAll: "View all",
      totalGames: "Total Games",
      netProfit: "Net Profit",
      winRate: "Win Rate",
    },
    groups: {
      myGroups: "My Groups",
      createGroup: "Create Group",
      joinGroup: "Join Group",
      noGroups: "No groups yet",
      members: "members",
      games: "games",
      invite: "Invite",
      leaveGroup: "Leave Group",
      groupName: "Group Name",
    },
    game: {
      startGame: "Start Game",
      endGame: "End Game",
      buyIn: "Buy In",
      rebuy: "Rebuy",
      cashOut: "Cash Out",
      chips: "chips",
      pot: "Pot",
      players: "Players",
      host: "Host",
      active: "Active",
      ended: "Ended",
      settlement: "Settlement",
      owes: "owes",
      approve: "Approve",
      reject: "Reject",
    },
    settings: {
      title: "Preferences",
      appearance: "Appearance",
      language: "Language",
      notifications: "Alerts",
      privacy: "Privacy",
      hapticFeedback: "Haptic Feedback",
      voiceCommands: "Voice Commands",
      signOut: "Sign Out",
      signOutConfirm: "Are you sure you want to sign out?",
      profile: "Profile",
      billing: "Billing",
      light: "Light",
      dark: "Dark",
      system: "System",
    },
    voice: {
      title: "Voice Commands",
      listening: "Listening...",
      tapToSpeak: "Tap to speak",
      processing: "Processing...",
      commandRecognized: "Command recognized",
      tryAgain: "Try again",
      examples: "Try saying:",
      buyInExample: '"Buy in for $20"',
      rebuyExample: '"Rebuy $10"',
      cashOutExample: '"Cash out 45 chips"',
      helpExample: '"Help me with my hand"',
    },
    ai: {
      title: "AI Assistant",
      analyzing: "Analyzing...",
      suggestion: "Suggestion",
      highPotential: "High potential",
      mediumPotential: "Medium potential",
      lowPotential: "Low potential",
      disclaimer: "AI suggestions are for entertainment only",
    },
    auth: {
      signIn: "Sign In",
      signUp: "Sign Up",
      email: "Email",
      password: "Password",
      forgotPassword: "Forgot password?",
      noAccount: "Don't have an account?",
      hasAccount: "Already have an account?",
    },
  },
  
  es: {
    common: {
      cancel: "Cancelar",
      confirm: "Confirmar",
      save: "Guardar Cambios",
      delete: "Eliminar",
      edit: "Actualizar",
      back: "Atrás",
      next: "Siguiente",
      done: "Hecho",
      loading: "Preparando\u2026",
      error: "No disponible ahora",
      success: "Listo",
      retry: "Intentar de nuevo",
      search: "Buscar",
      noResults: "Sin actividad aún",
    },
    nav: {
      dashboard: "Resumen",
      groups: "Grupos",
      settings: "Preferencias",
      profile: "Perfil",
      notifications: "Alertas",
      chats: "Chats",
      games: "Juegos",
      wallet: "Billetera",
      aiAssistant: "Asistente IA",
      automations: "Flujos Inteligentes",
      settlements: "Liquidaciones",
      requestPay: "Solicitar y Pagar",
    },
    dashboard: {
      welcome: "Bienvenido",
      recentGames: "Juegos Recientes",
      quickActions: "Acciones Rápidas",
      noGames: "Sin juegos aún",
      viewAll: "Ver todo",
      totalGames: "Total de Juegos",
      netProfit: "Ganancia Neta",
      winRate: "Tasa de Victoria",
    },
    groups: {
      myGroups: "Mis Grupos",
      createGroup: "Crear Grupo",
      joinGroup: "Unirse al Grupo",
      noGroups: "Sin grupos aún",
      members: "miembros",
      games: "juegos",
      invite: "Invitar",
      leaveGroup: "Salir del Grupo",
      groupName: "Nombre del Grupo",
    },
    game: {
      startGame: "Iniciar Juego",
      endGame: "Terminar Juego",
      buyIn: "Comprar Fichas",
      rebuy: "Recompra",
      cashOut: "Cobrar",
      chips: "fichas",
      pot: "Bote",
      players: "Jugadores",
      host: "Anfitrión",
      active: "Activo",
      ended: "Terminado",
      settlement: "Liquidación",
      owes: "debe",
      approve: "Aprobar",
      reject: "Rechazar",
    },
    settings: {
      title: "Preferencias",
      appearance: "Apariencia",
      language: "Idioma",
      notifications: "Alertas",
      privacy: "Privacidad",
      hapticFeedback: "Vibración",
      voiceCommands: "Comandos de Voz",
      signOut: "Cerrar Sesión",
      signOutConfirm: "¿Seguro que quieres cerrar sesión?",
      profile: "Perfil",
      billing: "Facturación",
      light: "Claro",
      dark: "Oscuro",
      system: "Sistema",
    },
    voice: {
      title: "Comandos de Voz",
      listening: "Escuchando...",
      tapToSpeak: "Toca para hablar",
      processing: "Procesando...",
      commandRecognized: "Comando reconocido",
      tryAgain: "Intentar de nuevo",
      examples: "Intenta decir:",
      buyInExample: '"Comprar por $20"',
      rebuyExample: '"Recompra $10"',
      cashOutExample: '"Cobrar 45 fichas"',
      helpExample: '"Ayuda con mi mano"',
    },
    ai: {
      title: "Asistente IA",
      analyzing: "Analizando...",
      suggestion: "Sugerencia",
      highPotential: "Alto potencial",
      mediumPotential: "Potencial medio",
      lowPotential: "Bajo potencial",
      disclaimer: "Las sugerencias de IA son solo para entretenimiento",
    },
    auth: {
      signIn: "Iniciar Sesión",
      signUp: "Registrarse",
      email: "Correo",
      password: "Contraseña",
      forgotPassword: "¿Olvidaste tu contraseña?",
      noAccount: "¿No tienes cuenta?",
      hasAccount: "¿Ya tienes cuenta?",
    },
  },
  
  fr: {
    common: {
      cancel: "Annuler",
      confirm: "Confirmer",
      save: "Enregistrer",
      delete: "Supprimer",
      edit: "Mettre à jour",
      back: "Retour",
      next: "Suivant",
      done: "Terminé",
      loading: "Préparation\u2026",
      error: "Indisponible pour le moment",
      success: "C'est fait",
      retry: "Réessayer",
      search: "Rechercher",
      noResults: "Aucune activité",
    },
    nav: {
      dashboard: "Aperçu",
      groups: "Groupes",
      settings: "Préférences",
      profile: "Profil",
      notifications: "Alertes",
      chats: "Chats",
      games: "Parties",
      wallet: "Portefeuille",
      aiAssistant: "Assistant IA",
      automations: "Flux Intelligents",
      settlements: "Règlements",
      requestPay: "Demander et Payer",
    },
    dashboard: {
      welcome: "Bienvenue",
      recentGames: "Parties Récentes",
      quickActions: "Actions Rapides",
      noGames: "Aucune partie",
      viewAll: "Voir tout",
      totalGames: "Total des Parties",
      netProfit: "Profit Net",
      winRate: "Taux de Victoire",
    },
    groups: {
      myGroups: "Mes Groupes",
      createGroup: "Créer un Groupe",
      joinGroup: "Rejoindre un Groupe",
      noGroups: "Aucun groupe",
      members: "membres",
      games: "parties",
      invite: "Inviter",
      leaveGroup: "Quitter le Groupe",
      groupName: "Nom du Groupe",
    },
    game: {
      startGame: "Démarrer la Partie",
      endGame: "Terminer la Partie",
      buyIn: "Cave",
      rebuy: "Recave",
      cashOut: "Encaisser",
      chips: "jetons",
      pot: "Pot",
      players: "Joueurs",
      host: "Hôte",
      active: "Actif",
      ended: "Terminé",
      settlement: "Règlement",
      owes: "doit",
      approve: "Approuver",
      reject: "Refuser",
    },
    settings: {
      title: "Préférences",
      appearance: "Apparence",
      language: "Langue",
      notifications: "Alertes",
      privacy: "Confidentialité",
      hapticFeedback: "Retour Haptique",
      voiceCommands: "Commandes Vocales",
      signOut: "Déconnexion",
      signOutConfirm: "Voulez-vous vraiment vous déconnecter?",
      profile: "Profil",
      billing: "Facturation",
      light: "Clair",
      dark: "Sombre",
      system: "Système",
    },
    voice: {
      title: "Commandes Vocales",
      listening: "Écoute...",
      tapToSpeak: "Appuyez pour parler",
      processing: "Traitement...",
      commandRecognized: "Commande reconnue",
      tryAgain: "Réessayer",
      examples: "Essayez de dire:",
      buyInExample: '"Cave de 20$"',
      rebuyExample: '"Recave 10$"',
      cashOutExample: '"Encaisser 45 jetons"',
      helpExample: '"Aide pour ma main"',
    },
    ai: {
      title: "Assistant IA",
      analyzing: "Analyse...",
      suggestion: "Suggestion",
      highPotential: "Fort potentiel",
      mediumPotential: "Potentiel moyen",
      lowPotential: "Faible potentiel",
      disclaimer: "Les suggestions IA sont uniquement pour le divertissement",
    },
    auth: {
      signIn: "Connexion",
      signUp: "Inscription",
      email: "Email",
      password: "Mot de passe",
      forgotPassword: "Mot de passe oublié?",
      noAccount: "Pas de compte?",
      hasAccount: "Déjà un compte?",
    },
  },
  
  de: {
    common: {
      cancel: "Abbrechen",
      confirm: "Bestätigen",
      save: "Änderungen speichern",
      delete: "Löschen",
      edit: "Aktualisieren",
      back: "Zurück",
      next: "Weiter",
      done: "Fertig",
      loading: "Wird vorbereitet\u2026",
      error: "Derzeit nicht verfügbar",
      success: "Alles klar",
      retry: "Erneut versuchen",
      search: "Suchen",
      noResults: "Noch keine Aktivität",
    },
    nav: {
      dashboard: "Überblick",
      groups: "Gruppen",
      settings: "Einstellungen",
      profile: "Profil",
      notifications: "Hinweise",
      chats: "Chats",
      games: "Spiele",
      wallet: "Wallet",
      aiAssistant: "KI-Assistent",
      automations: "Smart Flows",
      settlements: "Abrechnungen",
      requestPay: "Anfordern & Bezahlen",
    },
    dashboard: {
      welcome: "Willkommen zurück",
      recentGames: "Letzte Spiele",
      quickActions: "Schnellaktionen",
      noGames: "Noch keine Spiele",
      viewAll: "Alle anzeigen",
      totalGames: "Gesamte Spiele",
      netProfit: "Nettogewinn",
      winRate: "Gewinnrate",
    },
    groups: {
      myGroups: "Meine Gruppen",
      createGroup: "Gruppe erstellen",
      joinGroup: "Gruppe beitreten",
      noGroups: "Noch keine Gruppen",
      members: "Mitglieder",
      games: "Spiele",
      invite: "Einladen",
      leaveGroup: "Gruppe verlassen",
      groupName: "Gruppenname",
    },
    game: {
      startGame: "Spiel starten",
      endGame: "Spiel beenden",
      buyIn: "Buy-In",
      rebuy: "Rebuy",
      cashOut: "Auszahlen",
      chips: "Chips",
      pot: "Pot",
      players: "Spieler",
      host: "Gastgeber",
      active: "Aktiv",
      ended: "Beendet",
      settlement: "Abrechnung",
      owes: "schuldet",
      approve: "Genehmigen",
      reject: "Ablehnen",
    },
    settings: {
      title: "Einstellungen",
      appearance: "Erscheinungsbild",
      language: "Sprache",
      notifications: "Hinweise",
      privacy: "Datenschutz",
      hapticFeedback: "Haptisches Feedback",
      voiceCommands: "Sprachbefehle",
      signOut: "Abmelden",
      signOutConfirm: "Möchten Sie sich wirklich abmelden?",
      profile: "Profil",
      billing: "Abrechnung",
      light: "Hell",
      dark: "Dunkel",
      system: "System",
    },
    voice: {
      title: "Sprachbefehle",
      listening: "Höre zu...",
      tapToSpeak: "Tippen zum Sprechen",
      processing: "Verarbeite...",
      commandRecognized: "Befehl erkannt",
      tryAgain: "Erneut versuchen",
      examples: "Sagen Sie:",
      buyInExample: '"Buy-In für 20$"',
      rebuyExample: '"Rebuy 10$"',
      cashOutExample: '"Auszahlen 45 Chips"',
      helpExample: '"Hilf mir mit meiner Hand"',
    },
    ai: {
      title: "KI-Assistent",
      analyzing: "Analysiere...",
      suggestion: "Vorschlag",
      highPotential: "Hohes Potenzial",
      mediumPotential: "Mittleres Potenzial",
      lowPotential: "Niedriges Potenzial",
      disclaimer: "KI-Vorschläge dienen nur zur Unterhaltung",
    },
    auth: {
      signIn: "Anmelden",
      signUp: "Registrieren",
      email: "E-Mail",
      password: "Passwort",
      forgotPassword: "Passwort vergessen?",
      noAccount: "Kein Konto?",
      hasAccount: "Bereits ein Konto?",
    },
  },
  
  hi: {
    common: {
      cancel: "रद्द करें",
      confirm: "पुष्टि करें",
      save: "बदलाव सहेजें",
      delete: "हटाएं",
      edit: "अपडेट करें",
      back: "वापस",
      next: "अगला",
      done: "हो गया",
      loading: "तैयारी हो रही है\u2026",
      error: "अभी उपलब्ध नहीं",
      success: "सब तैयार",
      retry: "फिर से कोशिश करें",
      search: "खोजें",
      noResults: "अभी कोई गतिविधि नहीं",
    },
    nav: {
      dashboard: "अवलोकन",
      groups: "समूह",
      settings: "प्राथमिकताएं",
      profile: "प्रोफ़ाइल",
      notifications: "अलर्ट",
      chats: "चैट्स",
      games: "गेम्स",
      wallet: "वॉलेट",
      aiAssistant: "AI सहायक",
      automations: "स्मार्ट फ़्लो",
      settlements: "निपटान",
      requestPay: "अनुरोध और भुगतान",
    },
    dashboard: {
      welcome: "वापसी पर स्वागत है",
      recentGames: "हाल के गेम",
      quickActions: "त्वरित क्रियाएं",
      noGames: "अभी कोई गेम नहीं",
      viewAll: "सभी देखें",
      totalGames: "कुल गेम",
      netProfit: "शुद्ध लाभ",
      winRate: "जीत दर",
    },
    groups: {
      myGroups: "मेरे समूह",
      createGroup: "समूह बनाएं",
      joinGroup: "समूह में शामिल हों",
      noGroups: "अभी कोई समूह नहीं",
      members: "सदस्य",
      games: "गेम",
      invite: "आमंत्रित करें",
      leaveGroup: "समूह छोड़ें",
      groupName: "समूह का नाम",
    },
    game: {
      startGame: "गेम शुरू करें",
      endGame: "गेम समाप्त करें",
      buyIn: "बाय-इन",
      rebuy: "रीबाय",
      cashOut: "कैश आउट",
      chips: "चिप्स",
      pot: "पॉट",
      players: "खिलाड़ी",
      host: "होस्ट",
      active: "सक्रिय",
      ended: "समाप्त",
      settlement: "निपटान",
      owes: "देना है",
      approve: "स्वीकृत करें",
      reject: "अस्वीकार करें",
    },
    settings: {
      title: "प्राथमिकताएं",
      appearance: "दिखावट",
      language: "भाषा",
      notifications: "अलर्ट",
      privacy: "गोपनीयता",
      hapticFeedback: "हैप्टिक फ़ीडबैक",
      voiceCommands: "वॉइस कमांड",
      signOut: "साइन आउट",
      signOutConfirm: "क्या आप वाकई साइन आउट करना चाहते हैं?",
      profile: "प्रोफ़ाइल",
      billing: "बिलिंग",
      light: "लाइट",
      dark: "डार्क",
      system: "सिस्टम",
    },
    voice: {
      title: "वॉइस कमांड",
      listening: "सुन रहा है...",
      tapToSpeak: "बोलने के लिए टैप करें",
      processing: "प्रोसेस हो रहा है...",
      commandRecognized: "कमांड पहचाना गया",
      tryAgain: "फिर से कोशिश करें",
      examples: "कहकर देखें:",
      buyInExample: '"$20 का बाय-इन"',
      rebuyExample: '"$10 रीबाय"',
      cashOutExample: '"45 चिप्स कैश आउट"',
      helpExample: '"मेरे हाथ में मदद करो"',
    },
    ai: {
      title: "AI सहायक",
      analyzing: "विश्लेषण...",
      suggestion: "सुझाव",
      highPotential: "उच्च संभावना",
      mediumPotential: "मध्यम संभावना",
      lowPotential: "कम संभावना",
      disclaimer: "AI सुझाव केवल मनोरंजन के लिए हैं",
    },
    auth: {
      signIn: "साइन इन",
      signUp: "साइन अप",
      email: "ईमेल",
      password: "पासवर्ड",
      forgotPassword: "पासवर्ड भूल गए?",
      noAccount: "खाता नहीं है?",
      hasAccount: "पहले से खाता है?",
    },
  },
  
  pt: {
    common: {
      cancel: "Cancelar",
      confirm: "Confirmar",
      save: "Salvar Alterações",
      delete: "Excluir",
      edit: "Atualizar",
      back: "Voltar",
      next: "Próximo",
      done: "Concluído",
      loading: "Preparando\u2026",
      error: "Indisponível no momento",
      success: "Tudo certo",
      retry: "Tentar novamente",
      search: "Buscar",
      noResults: "Sem atividade ainda",
    },
    nav: {
      dashboard: "Visão Geral",
      groups: "Grupos",
      settings: "Preferências",
      profile: "Perfil",
      notifications: "Alertas",
      chats: "Chats",
      games: "Jogos",
      wallet: "Carteira",
      aiAssistant: "Assistente IA",
      automations: "Fluxos Inteligentes",
      settlements: "Acertos",
      requestPay: "Solicitar e Pagar",
    },
    dashboard: {
      welcome: "Bem-vindo de volta",
      recentGames: "Jogos Recentes",
      quickActions: "Ações Rápidas",
      noGames: "Nenhum jogo ainda",
      viewAll: "Ver tudo",
      totalGames: "Total de Jogos",
      netProfit: "Lucro Líquido",
      winRate: "Taxa de Vitória",
    },
    groups: {
      myGroups: "Meus Grupos",
      createGroup: "Criar Grupo",
      joinGroup: "Entrar no Grupo",
      noGroups: "Nenhum grupo ainda",
      members: "membros",
      games: "jogos",
      invite: "Convidar",
      leaveGroup: "Sair do Grupo",
      groupName: "Nome do Grupo",
    },
    game: {
      startGame: "Iniciar Jogo",
      endGame: "Encerrar Jogo",
      buyIn: "Buy-In",
      rebuy: "Rebuy",
      cashOut: "Sacar",
      chips: "fichas",
      pot: "Pote",
      players: "Jogadores",
      host: "Anfitrião",
      active: "Ativo",
      ended: "Encerrado",
      settlement: "Acerto",
      owes: "deve",
      approve: "Aprovar",
      reject: "Rejeitar",
    },
    settings: {
      title: "Preferências",
      appearance: "Aparência",
      language: "Idioma",
      notifications: "Alertas",
      privacy: "Privacidade",
      hapticFeedback: "Feedback Háptico",
      voiceCommands: "Comandos de Voz",
      signOut: "Sair",
      signOutConfirm: "Tem certeza que deseja sair?",
      profile: "Perfil",
      billing: "Cobrança",
      light: "Claro",
      dark: "Escuro",
      system: "Sistema",
    },
    voice: {
      title: "Comandos de Voz",
      listening: "Ouvindo...",
      tapToSpeak: "Toque para falar",
      processing: "Processando...",
      commandRecognized: "Comando reconhecido",
      tryAgain: "Tentar novamente",
      examples: "Tente dizer:",
      buyInExample: '"Buy-in de $20"',
      rebuyExample: '"Rebuy $10"',
      cashOutExample: '"Sacar 45 fichas"',
      helpExample: '"Ajuda com minha mão"',
    },
    ai: {
      title: "Assistente IA",
      analyzing: "Analisando...",
      suggestion: "Sugestão",
      highPotential: "Alto potencial",
      mediumPotential: "Potencial médio",
      lowPotential: "Baixo potencial",
      disclaimer: "Sugestões de IA são apenas para entretenimento",
    },
    auth: {
      signIn: "Entrar",
      signUp: "Cadastrar",
      email: "Email",
      password: "Senha",
      forgotPassword: "Esqueceu a senha?",
      noAccount: "Não tem conta?",
      hasAccount: "Já tem conta?",
    },
  },
  
  zh: {
    common: {
      cancel: "取消",
      confirm: "确认",
      save: "保存更改",
      delete: "删除",
      edit: "更新",
      back: "返回",
      next: "下一步",
      done: "完成",
      loading: "准备中\u2026",
      error: "暂时无法使用",
      success: "一切就绪",
      retry: "再试一次",
      search: "搜索",
      noResults: "暂无活动",
    },
    nav: {
      dashboard: "概览",
      groups: "群组",
      settings: "偏好设置",
      profile: "个人资料",
      notifications: "提醒",
      chats: "聊天",
      games: "游戏",
      wallet: "钱包",
      aiAssistant: "AI助手",
      automations: "智能流程",
      settlements: "结算",
      requestPay: "请求和支付",
    },
    dashboard: {
      welcome: "欢迎回来",
      recentGames: "最近游戏",
      quickActions: "快捷操作",
      noGames: "暂无游戏",
      viewAll: "查看全部",
      totalGames: "总游戏数",
      netProfit: "净利润",
      winRate: "胜率",
    },
    groups: {
      myGroups: "我的群组",
      createGroup: "创建群组",
      joinGroup: "加入群组",
      noGroups: "暂无群组",
      members: "成员",
      games: "游戏",
      invite: "邀请",
      leaveGroup: "退出群组",
      groupName: "群组名称",
    },
    game: {
      startGame: "开始游戏",
      endGame: "结束游戏",
      buyIn: "买入",
      rebuy: "补买",
      cashOut: "兑现",
      chips: "筹码",
      pot: "奖池",
      players: "玩家",
      host: "主持人",
      active: "进行中",
      ended: "已结束",
      settlement: "结算",
      owes: "欠",
      approve: "批准",
      reject: "拒绝",
    },
    settings: {
      title: "偏好设置",
      appearance: "外观",
      language: "语言",
      notifications: "提醒",
      privacy: "隐私",
      hapticFeedback: "触感反馈",
      voiceCommands: "语音命令",
      signOut: "退出登录",
      signOutConfirm: "确定要退出登录吗？",
      profile: "个人资料",
      billing: "账单",
      light: "浅色",
      dark: "深色",
      system: "跟随系统",
    },
    voice: {
      title: "语音命令",
      listening: "聆听中...",
      tapToSpeak: "点击说话",
      processing: "处理中...",
      commandRecognized: "命令已识别",
      tryAgain: "再试一次",
      examples: "试着说:",
      buyInExample: '"买入20美元"',
      rebuyExample: '"补买10美元"',
      cashOutExample: '"兑现45筹码"',
      helpExample: '"帮我分析手牌"',
    },
    ai: {
      title: "AI助手",
      analyzing: "分析中...",
      suggestion: "建议",
      highPotential: "高潜力",
      mediumPotential: "中等潜力",
      lowPotential: "低潜力",
      disclaimer: "AI建议仅供娱乐参考",
    },
    auth: {
      signIn: "登录",
      signUp: "注册",
      email: "邮箱",
      password: "密码",
      forgotPassword: "忘记密码？",
      noAccount: "没有账号？",
      hasAccount: "已有账号？",
    },
  },
};

export default translations;
export type { TranslationKeys };
