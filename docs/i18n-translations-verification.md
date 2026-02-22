# i18n Translation Verification Guide

This document lists every translated UI string, its translation in all 5 supported languages, the source component(s) in code, and how to access the string in the running app.

> **Note:** Landing page strings (`landing.json`) are excluded — they remain in English only.
> Brand names (Global Nature Watch, Global Forest Watch, Land & Carbon Lab, PREVIEW) are kept in English across all locales.

---

## Table of Contents

1. [common.json — App Shell & Shared UI](#1-commonjson--app-shell--shared-ui)
2. [chat.json — Chat Interface](#2-chatjson--chat-interface)
3. [dialogs.json — Modals & Dialogs](#3-dialogsjson--modals--dialogs)
4. [onboarding.json — Onboarding Form](#4-onboardingjson--onboarding-form)
5. [dashboard.json — Dashboard / Settings](#5-dashboardjson--dashboard--settings)
6. [errors.json — Error & Status Pages](#6-errorsjson--error--status-pages)

---

## 1. `common.json` — App Shell & Shared UI

### Brand & Global

| Key | EN | FR | ES | PT | ID | Component(s) | How to Access |
|---|---|---|---|---|---|---|---|
| `appName` | Global Nature Watch | Global Nature Watch | Global Nature Watch | Global Nature Watch | Global Nature Watch | `PageHeader.tsx`, `sidebar.tsx`, `GlobalHeader.tsx`, `12_Footer.tsx` | App header logo text, sidebar header, landing footer |
| `preview` | PREVIEW | PREVIEW | PREVIEW | PREVIEW | PREVIEW | `PageHeader.tsx`, `sidebar.tsx` | Badge next to app name in header & sidebar |
| `tagline` | Turning intelligent monitoring into impact | Transformer le suivi intelligent en impact | Transformando el monitoreo inteligente en impacto | Transformando monitoramento inteligente em impacto | Mengubah pemantauan cerdas menjadi dampak | `GlobalHeader.tsx` | Landing page header below logo |

### Navigation

| Key | EN | FR | ES | PT | ID | Component(s) | How to Access |
|---|---|---|---|---|---|---|---|
| `nav.useCases` | Use cases | Cas d'utilisation | Casos de uso | Casos de uso | Kasus penggunaan | `GlobalHeader.tsx` | Landing page → top nav links |
| `nav.technology` | Technology | Technologie | Tecnología | Tecnologia | Teknologi | `GlobalHeader.tsx` | Landing page → top nav links |
| `nav.research` | Research | Recherche | Investigación | Pesquisa | Penelitian | `GlobalHeader.tsx` | Landing page → top nav links |
| `nav.about` | About | À propos | Acerca de | Sobre | Tentang | `GlobalHeader.tsx` | Landing page → top nav links |
| `nav.signIn` | Sign in (invite only) | Se connecter (sur invitation) | Iniciar sesión (solo invitación) | Entrar (somente convidados) | Masuk (khusus undangan) | `GlobalHeader.tsx` | Landing page → top-right sign in button |
| `nav.joinWaitlist` | Join waitlist | Rejoindre la liste d'attente | Unirse a la lista de espera | Entrar na lista de espera | Gabung daftar tunggu | `GlobalHeader.tsx` | Landing page → top-right CTA (when closed preview) |
| `nav.explorePreview` | Explore the preview | Explorer l'aperçu | Explorar la vista previa | Explorar a pré-visualização | Jelajahi pratinjau | `GlobalHeader.tsx` | Landing page → top-right CTA (when public preview) |
| `nav.menu` | Menu | Menu | Menú | Menu | Menu | `GlobalHeader.tsx` | Landing page → mobile hamburger menu label |
| `nav.backToHomepage` | Back to homepage | Retour à l'accueil | Volver al inicio | Voltar à página inicial | Kembali ke beranda | `GlobalHeader.tsx` | Landing page → mobile menu back link |

### Buttons (Shared)

| Key | EN | FR | ES | PT | ID | Component(s) | How to Access |
|---|---|---|---|---|---|---|---|
| `buttons.cancel` | Cancel | Annuler | Cancelar | Cancelar | Batal | Various dialogs | Cancel button in any modal/dialog |
| `buttons.save` | Save | Enregistrer | Guardar | Salvar | Simpan | Various dialogs | Save button in modals |
| `buttons.delete` | Delete | Supprimer | Eliminar | Excluir | Hapus | Thread delete dialog | Delete confirmation button |
| `buttons.close` | Close | Fermer | Cerrar | Fechar | Tutup | Various dialogs | Close button in modals |
| `buttons.copy` | Copy | Copier | Copiar | Copiar | Salin | Various | Copy button in UI |
| `buttons.clear` | Clear | Effacer | Limpiar | Limpar | Bersihkan | Various | Clear button in forms/uploads |
| `buttons.upload` | Upload | Téléverser | Subir | Enviar | Unggah | Upload dialog | Upload button |
| `buttons.help` | Help | Aide | Ayuda | Ajuda | Bantuan | `PageHeader.tsx`, `sidebar.tsx` | `/app` → header or sidebar bottom help link |

### Sidebar

| Key | EN | FR | ES | PT | ID | Component(s) | How to Access |
|---|---|---|---|---|---|---|---|
| `sidebar.newConversation` | New Conversation | Nouvelle conversation | Nueva conversación | Nova conversa | Percakapan baru | `sidebar.tsx` | `/app` → sidebar "New Conversation" button |
| `sidebar.closeSidebar` | Close sidebar | Fermer le panneau latéral | Cerrar barra lateral | Fechar painel lateral | Tutup panel samping | `sidebar.tsx` | `/app` → sidebar close button tooltip |
| `sidebar.openSidebar` | Open sidebar | Ouvrir le panneau latéral | Abrir barra lateral | Abrir painel lateral | Buka panel samping | `sidebar.tsx` | `/app` → collapsed sidebar open button tooltip |
| `sidebar.today` | Today | Aujourd'hui | Hoy | Hoje | Hari ini | `sidebar.tsx` | `/app` → sidebar thread group heading |
| `sidebar.previousWeek` | Previous 7 days | 7 derniers jours | Últimos 7 días | Últimos 7 dias | 7 hari terakhir | `sidebar.tsx` | `/app` → sidebar thread group heading |
| `sidebar.older` | Older Conversations | Conversations anciennes | Conversaciones anteriores | Conversas anteriores | Percakapan lama | `sidebar.tsx` | `/app` → sidebar thread group heading |
| `sidebar.apiStatus` | API Status: {status} | État de l'API : {status} | Estado de la API: {status} | Status da API: {status} | Status API: {status} | `sidebar.tsx` | `/app` → sidebar bottom status indicator |
| `sidebar.availablePrompts` | Available Prompts | Questions disponibles | Consultas disponibles | Consultas disponíveis | Pertanyaan tersedia | `sidebar.tsx` | `/app` → sidebar prompts section heading |
| `sidebar.promptsCount` | {used}/{total} Prompts | {used}/{total} questions | {used}/{total} consultas | {used}/{total} consultas | {used}/{total} pertanyaan | `sidebar.tsx` | `/app` → sidebar prompts counter |

### Header

| Key | EN | FR | ES | PT | ID | Component(s) | How to Access |
|---|---|---|---|---|---|---|---|
| `header.dailyPrompts` | daily prompts | questions quotidiennes | consultas diarias | consultas diárias | pertanyaan harian | `PageHeader.tsx` | `/app` → header prompts badge label |
| `header.unlimitedPrompts` | You have unlimited prompts! | Vous avez des questions illimitées ! | ¡Tienes consultas ilimitadas! | Você tem consultas ilimitadas! | Anda memiliki pertanyaan tak terbatas! | `PageHeader.tsx` | `/app` → header prompts tooltip (unlimited users) |
| `header.promptsUsageTooltip` | {used} of {total} prompts used. Prompts refresh every 24 hours. | {used} sur {total} questions utilisées. Les questions se renouvellent toutes les 24 heures. | {used} de {total} consultas utilizadas. Las consultas se renuevan cada 24 horas. | {used} de {total} consultas utilizadas. As consultas se renovam a cada 24 horas. | {used} dari {total} pertanyaan digunakan. Pertanyaan diperbarui setiap 24 jam. | `PageHeader.tsx` | `/app` → hover/click prompts counter in header |
| `header.settings` | Settings | Paramètres | Configuración | Configurações | Pengaturan | `PageHeader.tsx` | `/app` → user avatar menu → Settings |
| `header.logout` | Logout | Déconnexion | Cerrar sesión | Sair | Keluar | `PageHeader.tsx`, `sidebar.tsx` | `/app` → user avatar menu → Logout |
| `header.loginSignup` | Log in / Sign Up | Connexion / Inscription | Iniciar sesión / Registrarse | Entrar / Cadastrar | Masuk / Daftar | `PageHeader.tsx` | `/app` → header login button (unauthenticated) |
| `header.userName` | User name | Nom d'utilisateur | Nombre de usuario | Nome de usuário | Nama pengguna | `PageHeader.tsx` | `/app` → fallback when user email not available |

### Language Selector

| Key | EN | FR | ES | PT | ID | Component(s) | How to Access |
|---|---|---|---|---|---|---|---|
| `languageSelector.sectionLabel` | Display Language | Langue d'affichage | Idioma de la interfaz | Idioma da interface | Bahasa tampilan | `LanguageSelector.tsx` | `/app` → header language button → dropdown section label |
| `languageSelector.otherLanguages` | Other Languages… | Autres langues… | Otros idiomas… | Outros idiomas… | Bahasa lainnya… | `LanguageSelector.tsx` | `/app` → header language dropdown → bottom item |
| `languageSelector.otherToastTitle` | Chat in Any Language | Discutez dans n'importe quelle langue | Chatea en cualquier idioma | Converse em qualquer idioma | Ngobrol dalam bahasa apa pun | `LanguageSelector.tsx` | `/app` → click "Other Languages…" → toast title |
| `languageSelector.otherToastDescription` | While the interface is available in 5 languages, you can chat with the assistant in your preferred language and it will understand and respond accordingly. | L'interface est disponible en 5 langues, mais vous pouvez discuter avec l'assistant dans votre langue préférée et il comprendra et répondra en conséquence. | La interfaz está disponible en 5 idiomas, pero puedes chatear con el asistente en tu idioma preferido y entenderá y responderá en consecuencia. | A interface está disponível em 5 idiomas, mas você pode conversar com o assistente no seu idioma preferido e ele entenderá e responderá adequadamente. | Antarmuka tersedia dalam 5 bahasa, tetapi Anda dapat mengobrol dengan asisten dalam bahasa pilihan Anda dan asisten akan memahami serta merespons dengan tepat. | `LanguageSelector.tsx` | `/app` → click "Other Languages…" → toast body |

### Auth

| Key | EN | FR | ES | PT | ID | Component(s) | How to Access |
|---|---|---|---|---|---|---|---|
| `auth.loggingOut` | Logging out | Déconnexion en cours | Cerrando sesión | Saindo | Sedang keluar | `PageHeader.tsx`, `sidebar.tsx` | `/app` → click Logout → toast title |
| `auth.loggingOutDescription` | Signing you out and redirecting… | Déconnexion et redirection… | Cerrando sesión y redirigiendo… | Saindo e redirecionando… | Mengeluarkan Anda dan mengalihkan… | `PageHeader.tsx`, `sidebar.tsx` | `/app` → click Logout → toast description |

### Footer

| Key | EN | FR | ES | PT | ID | Component(s) | How to Access |
|---|---|---|---|---|---|---|---|
| `footer.privacyPolicy` | Privacy Policy | Politique de confidentialité | Política de privacidad | Política de Privacidade | Kebijakan Privasi | `12_Footer.tsx` | Landing page → footer links |
| `footer.aiPrivacyPolicy` | AI Privacy Policy | Politique de confidentialité IA | Política de privacidad IA | Política de Privacidade IA | Kebijakan Privasi AI | `12_Footer.tsx` | Landing page → footer links |
| `footer.termsOfUse` | Terms of Use | Conditions d'utilisation | Términos de uso | Termos de Uso | Ketentuan Penggunaan | `12_Footer.tsx` | Landing page → footer links |
| `footer.aiTermsOfUse` | AI Terms of Use | Conditions d'utilisation IA | Términos de uso IA | Termos de Uso IA | Ketentuan Penggunaan AI | `12_Footer.tsx` | Landing page → footer links |
| `footer.copyright` | ©Global Nature Watch {year} | ©Global Nature Watch {year} | ©Global Nature Watch {year} | ©Global Nature Watch {year} | ©Global Nature Watch {year} | `12_Footer.tsx` | Landing page → footer copyright |
| `footer.copyrightLong` | {year} Global Nature Watch | {year} Global Nature Watch | {year} Global Nature Watch | {year} Global Nature Watch | {year} Global Nature Watch | `12_Footer.tsx` | Landing page → footer copyright (long form) |

---

## 2. `chat.json` — Chat Interface

### Welcome Modal

| Key | EN | FR | ES | PT | ID | Component(s) | How to Access |
|---|---|---|---|---|---|---|---|
| `welcome.title` | Welcome to  | Bienvenue sur  | Bienvenido a  | Bem-vindo ao  | Selamat datang di  | `WelcomeModal.tsx` | `/app` → first visit welcome modal heading |
| `welcome.titleBold` | Global Nature Watch | Global Nature Watch | Global Nature Watch | Global Nature Watch | Global Nature Watch | `WelcomeModal.tsx` | `/app` → welcome modal heading (bold part) |
| `welcome.description` | Our AI-powered nature monitoring tool understands plain language… | Notre outil de suivi de la nature alimenté par l'IA comprend le langage courant… | Nuestra herramienta de monitoreo de la naturaleza impulsada por IA entiende lenguaje cotidiano… | Nossa ferramenta de monitoramento da natureza com IA entende linguagem cotidiana… | Alat pemantauan alam kami yang didukung AI memahami bahasa sehari-hari… | `WelcomeModal.tsx` | `/app` → welcome modal description paragraph |
| `welcome.separator` | ...or try asking about... | ...ou essayez de demander... | ...o intenta preguntar sobre... | ...ou tente perguntar sobre... | ...atau coba tanyakan tentang... | `WelcomeModal.tsx` | `/app` → welcome modal separator between input and suggestions |
| `welcome.placeholder` | Ask a question... | Posez une question... | Haz una pregunta... | Faça uma pergunta... | Ajukan pertanyaan... | `WelcomeModal.tsx` | `/app` → welcome modal input placeholder |
| `welcome.dontShowAgain` | Don't show this again | Ne plus afficher | No mostrar de nuevo | Não mostrar novamente | Jangan tampilkan lagi | `WelcomeModal.tsx` | `/app` → welcome modal checkbox at bottom |

### Chat Input

| Key | EN | FR | ES | PT | ID | Component(s) | How to Access |
|---|---|---|---|---|---|---|---|
| `input.placeholder` | Ask a question... | Posez une question... | Haz una pregunta... | Faça uma pergunta... | Ajukan pertanyaan... | `ChatInput.tsx` | `/app` → main chat input placeholder |
| `input.sending` | Sending... | Envoi en cours... | Enviando... | Enviando... | Mengirim... | `ChatInput.tsx` | `/app` → chat input while message is sending |
| `input.sendMessage` | Send message | Envoyer le message | Enviar mensaje | Enviar mensagem | Kirim pesan | `ChatInput.tsx` | `/app` → send button aria-label/tooltip |

### Context Chips

| Key | EN | FR | ES | PT | ID | Component(s) | How to Access |
|---|---|---|---|---|---|---|---|
| `context.layer` | Data Layer | Couche de données | Capa de datos | Camada de dados | Lapisan data | `ContextButton.tsx` | `/app` → context chips above chat input (layer label) |
| `context.area` | Area | Zone | Área | Área | Area | `ContextButton.tsx` | `/app` → context chips above chat input (area label) |
| `context.date` | Date | Date | Fecha | Data | Tanggal | `ContextButton.tsx` | `/app` → context chips above chat input (date label) |
| `context.label` | Context: | Contexte : | Contexto: | Contexto: | Konteks: | `MessageBubble.tsx` | `/app` → inside message bubble, context section label |

### Panel Header

| Key | EN | FR | ES | PT | ID | Component(s) | How to Access |
|---|---|---|---|---|---|---|---|
| `panelHeader.newConversation` | New Conversation | Nouvelle conversation | Nueva conversación | Nova conversa | Percakapan baru | `ChatPanelHeader.tsx` | `/app` → chat panel header title (no active thread) |
| `panelHeader.goToInsight` | Go to insight | Voir l'analyse | Ir al análisis | Ir para a análise | Lihat analisis | `ChatPanelHeader.tsx` | `/app` → chat panel header insight button |
| `panelHeader.noInsightsTooltip` | Ask a question to generate insights | Posez une question pour générer des analyses | Haz una pregunta para generar análisis | Faça uma pergunta para gerar análises | Ajukan pertanyaan untuk menghasilkan analisis | `ChatPanelHeader.tsx` | `/app` → hover disabled insight button |
| `panelHeader.newConversationTooltip` | New conversation | Nouvelle conversation | Nueva conversación | Nova conversa | Percakapan baru | `ChatPanelHeader.tsx` | `/app` → new conversation icon button tooltip |
| `panelHeader.widgetMeta` | {time} on {day} | {time} le {day} | {time} el {day} | {time} em {day} | {time} pada {day} | `ChatPanelHeader.tsx` | `/app` → widget metadata timestamp |

### Prompt Limits

| Key | EN | FR | ES | PT | ID | Component(s) | How to Access |
|---|---|---|---|---|---|---|---|
| `prompts.exhaustedGuest.title` | You've used all your guest prompts. | Vous avez utilisé toutes vos questions invité. | Has usado todas tus consultas de invitado. | Você usou todas as suas consultas de convidado. | Anda telah menggunakan semua pertanyaan tamu. | `ChatPanel.tsx` | `/app` → exhaust guest prompts → banner |
| `prompts.exhaustedGuest.loginLink` | Log in or sign up for free | Connectez-vous ou inscrivez-vous gratuitement | Inicia sesión o regístrate gratis | Entre ou cadastre-se gratuitamente | Masuk atau daftar gratis | `ChatPanel.tsx` | `/app` → guest prompt limit banner → link |
| `prompts.exhaustedGuest.unlockText` |  to unlock extra daily prompts, or  |  pour débloquer des questions quotidiennes supplémentaires, ou  |  para desbloquear consultas diarias adicionales, o  |  para desbloquear consultas diárias extras, ou  |  untuk membuka pertanyaan harian tambahan, atau  | `ChatPanel.tsx` | `/app` → guest prompt limit banner text |
| `prompts.exhaustedGuest.classicLink` | continue without AI | continuer sans IA | continuar sin IA | continuar sem IA | lanjutkan tanpa AI | `ChatPanel.tsx` | `/app` → guest prompt limit banner → GFW link |
| `prompts.exhaustedAuth.title` | You've reached today's limit of {total} prompts. | Vous avez atteint la limite de {total} questions pour aujourd'hui. | Has alcanzado el límite de {total} consultas de hoy. | Você atingiu o limite de {total} consultas de hoje. | Anda telah mencapai batas {total} pertanyaan hari ini. | `ChatPanel.tsx` | `/app` → auth user prompt limit banner |
| `prompts.exhaustedAuth.waitText` | Wait until tomorrow for new prompts, or  | Attendez demain pour de nouvelles questions, ou  | Espera hasta mañana para nuevas consultas, o  | Aguarde até amanhã para novas consultas, ou  | Tunggu hingga besok untuk pertanyaan baru, atau  | `ChatPanel.tsx` | `/app` → auth prompt limit banner text |
| `prompts.exhaustedAuth.classicLink` | continue without AI | continuer sans IA | continuar sin IA | continuar sem IA | lanjutkan tanpa AI | `ChatPanel.tsx` | `/app` → auth prompt limit banner → GFW link |

### Disclaimer

| Key | EN | FR | ES | PT | ID | Component(s) | How to Access |
|---|---|---|---|---|---|---|---|
| `disclaimer` | AI makes mistakes. Verify outputs and do not share any sensitive or personal information. | L'IA peut faire des erreurs. Vérifiez les résultats et ne partagez aucune information sensible ou personnelle. | La IA puede cometer errores. Verifica los resultados y no compartas información sensible o personal. | A IA pode cometer erros. Verifique os resultados e não compartilhe informações sensíveis ou pessoais. | AI dapat membuat kesalahan. Verifikasi hasilnya dan jangan bagikan informasi sensitif atau pribadi. | `ChatPanel.tsx` | `/app` → disclaimer bar below chat input |
| `hideDisclaimer` | Hide disclaimer | Masquer l'avertissement | Ocultar aviso | Ocultar aviso | Sembunyikan peringatan | `ChatDisclaimer.tsx` | `/app` → click X on disclaimer bar |
| `visualizationDisclaimer` | This visualization includes AI-generated charts… | Cette visualisation inclut des graphiques… générés par l'IA… | Esta visualización incluye gráficos… generados por IA… | Esta visualização inclui gráficos… gerados por IA… | Visualisasi ini mencakup grafik… yang dihasilkan oleh AI… | `VisualizationDisclaimer.tsx` | `/app` → below any chart/visualization widget |

### Reasoning

| Key | EN | FR | ES | PT | ID | Component(s) | How to Access |
|---|---|---|---|---|---|---|---|
| `reasoning.title` | Reasoning | Raisonnement | Razonamiento | Raciocínio | Penalaran | `Reasoning.tsx` | `/app` → while AI is processing, collapsible reasoning section heading |
| `reasoning.processing` | Processing request... | Traitement de la demande... | Procesando solicitud... | Processando solicitação... | Memproses permintaan... | `Reasoning.tsx` | `/app` → reasoning section fallback text |
| `reasoning.tools.generate_insights` | Generating insights | Génération des analyses | Generando análisis | Gerando análises | Menghasilkan analisis | `Reasoning.tsx` | `/app` → reasoning step label |
| `reasoning.tools.pick_aoi` | Picking area of interest | Sélection de la zone d'intérêt | Seleccionando área de interés | Selecionando área de interesse | Memilih area yang diminati | `Reasoning.tsx` | `/app` → reasoning step label |
| `reasoning.tools.pick_dataset` | Selecting dataset | Sélection du jeu de données | Seleccionando conjunto de datos | Selecionando conjunto de dados | Memilih kumpulan data | `Reasoning.tsx` | `/app` → reasoning step label |
| `reasoning.tools.pull_data` | Pulling data | Récupération des données | Obteniendo datos | Obtendo dados | Mengambil data | `Reasoning.tsx` | `/app` → reasoning step label |
| `reasoning.toolFallback` | Processing {name} | Traitement de {name} | Procesando {name} | Processando {name} | Memproses {name} | `Reasoning.tsx` | `/app` → reasoning step label (unknown tool) |

### Message Bubble

| Key | EN | FR | ES | PT | ID | Component(s) | How to Access |
|---|---|---|---|---|---|---|---|
| `message.timestamp` | {time} on {day} | {time} le {day} | {time} el {day} | {time} em {day} | {time} pada {day} | `MessageBubble.tsx` | `/app` → message timestamp below each bubble |
| `message.copyResponse` | Copy response | Copier la réponse | Copiar respuesta | Copiar resposta | Salin respons | `MessageBubble.tsx` | `/app` → hover AI message → copy button tooltip |
| `message.responseCopied` | Response copied to clipboard | Réponse copiée dans le presse-papiers | Respuesta copiada al portapapeles | Resposta copiada para a área de transferência | Respons disalin ke papan klip | `MessageBubble.tsx` | `/app` → click copy → tooltip changes |
| `message.goodResponse` | Good response | Bonne réponse | Buena respuesta | Boa resposta | Respons bagus | `MessageBubble.tsx` | `/app` → hover AI message → thumbs up tooltip |
| `message.badResponse` | Bad response | Mauvaise réponse | Mala respuesta | Resposta ruim | Respons buruk | `MessageBubble.tsx` | `/app` → hover AI message → thumbs down tooltip |
| `message.feedbackPlaceholder` | Tell us what went wrong (optional) | Dites-nous ce qui n'a pas fonctionné (facultatif) | Cuéntanos qué salió mal (opcional) | Conte-nos o que deu errado (opcional) | Ceritakan apa yang salah (opsional) | `MessageBubble.tsx` | `/app` → click thumbs down → textarea placeholder |
| `message.sendFeedback` | Send feedback | Envoyer le retour | Enviar comentario | Enviar feedback | Kirim masukan | `MessageBubble.tsx` | `/app` → feedback form submit button |
| `message.feedbackThanks` | Thanks for the feedback | Merci pour votre retour | Gracias por tu comentario | Obrigado pelo feedback | Terima kasih atas masukan Anda | `MessageBubble.tsx` | `/app` → thumbs up → toast title |
| `message.feedbackThanksDescription` | Glad it helped! | Content que cela ait aidé ! | ¡Nos alegra que haya ayudado! | Que bom que ajudou! | Senang bisa membantu! | `MessageBubble.tsx` | `/app` → thumbs up → toast description |
| `message.feedbackSent` | Feedback sent | Retour envoyé | Comentario enviado | Feedback enviado | Masukan terkirim | `MessageBubble.tsx` | `/app` → submit negative feedback → toast title |
| `message.feedbackSentDescription` | Thanks for helping us improve. | Merci de nous aider à nous améliorer. | Gracias por ayudarnos a mejorar. | Obrigado por nos ajudar a melhorar. | Terima kasih telah membantu kami meningkatkan layanan. | `MessageBubble.tsx` | `/app` → submit negative feedback → toast description |
| `message.markedNotHelpful` | Marked as not helpful | Marqué comme non utile | Marcado como no útil | Marcado como não útil | Ditandai sebagai tidak membantu | `MessageBubble.tsx` | `/app` → thumbs down (no comment) → toast title |
| `message.markedNotHelpfulDescription` | You can add a comment. | Vous pouvez ajouter un commentaire. | Puedes agregar un comentario. | Você pode adicionar um comentário. | Anda dapat menambahkan komentar. | `MessageBubble.tsx` | `/app` → thumbs down (no comment) → toast description |
| `message.unableToRate` | Unable to rate | Impossible d'évaluer | No se puede evaluar | Não foi possível avaliar | Tidak dapat menilai | `MessageBubble.tsx` | `/app` → rate message with no active thread → toast title |
| `message.noActiveThread` | No active thread. | Aucune conversation active. | No hay conversación activa. | Nenhuma conversa ativa. | Tidak ada percakapan aktif. | `MessageBubble.tsx` | `/app` → rate message with no active thread → toast description |
| `message.ratingFailed` | Rating failed | Échec de l'évaluation | Error en la evaluación | Falha na avaliação | Penilaian gagal | `MessageBubble.tsx` | `/app` → rating API error → toast title |
| `message.ratingFailedDescription` | Please try again. | Veuillez réessayer. | Por favor, inténtalo de nuevo. | Por favor, tente novamente. | Silakan coba lagi. | `MessageBubble.tsx` | `/app` → rating API error → toast description |

### Copy Selection Tooltip

| Key | EN | FR | ES | PT | ID | Component(s) | How to Access |
|---|---|---|---|---|---|---|---|
| `copyTooltip.notice` | This is AI-generated text. Please verify before using it in your work. | Ce texte est généré par l'IA. Veuillez vérifier avant de l'utiliser dans votre travail. | Este texto fue generado por IA. Por favor, verifícalo antes de usarlo en tu trabajo. | Este texto foi gerado por IA. Verifique antes de usá-lo em seu trabalho. | Teks ini dihasilkan oleh AI. Harap verifikasi sebelum menggunakannya dalam pekerjaan Anda. | `CopySelectionTooltip.tsx` | `/app` → select AI text → copy tooltip notice |

### Widget & Provenance

| Key | EN | FR | ES | PT | ID | Component(s) | How to Access |
|---|---|---|---|---|---|---|---|
| `widget.viewGenerated` | View how this was generated | Voir comment cela a été généré | Ver cómo se generó | Ver como foi gerado | Lihat cara pembuatannya | `WidgetMessage.tsx` | `/app` → below any widget → "View how…" link |
| `provenance.defaultTitle` | How this was generated | Comment cela a été généré | Cómo se generó | Como foi gerado | Cara pembuatannya | `InsightProvenanceDrawer.tsx` | `/app` → click "View how…" → drawer title |
| `provenance.noDetails` | No generation details available. | Aucun détail de génération disponible. | No hay detalles de generación disponibles. | Nenhum detalhe de geração disponível. | Tidak ada detail pembuatan yang tersedia. | `InsightProvenanceDrawer.tsx` | `/app` → provenance drawer empty state |
| `provenance.sources` | Sources | Sources | Fuentes | Fontes | Sumber | `InsightProvenanceDrawer.tsx` | `/app` → provenance drawer → Sources tab |
| `provenance.code` | Code | Code | Código | Código | Kode | `InsightProvenanceDrawer.tsx` | `/app` → provenance drawer → Code tab |
| `provenance.executionOutput` | Execution output | Résultat de l'exécution | Resultado de ejecución | Resultado da execução | Hasil eksekusi | `InsightProvenanceDrawer.tsx` | `/app` → provenance drawer → output section |
| `provenance.downloadSource` | Download Source files | Télécharger les fichiers sources | Descargar archivos fuente | Baixar arquivos fonte | Unduh file sumber | `InsightProvenanceDrawer.tsx` | `/app` → provenance drawer → download button tooltip |
| `provenance.copyCode` | Copy code | Copier le code | Copiar código | Copiar código | Salin kode | `InsightProvenanceDrawer.tsx` | `/app` → provenance drawer → copy code button tooltip |
| `provenance.copyOutput` | Copy output | Copier le résultat | Copiar resultado | Copiar resultado | Salin hasil | `InsightProvenanceDrawer.tsx` | `/app` → provenance drawer → copy output button tooltip |
| `provenance.downloadFailed` | Failed to download data. | Échec du téléchargement des données. | Error al descargar los datos. | Falha ao baixar os dados. | Gagal mengunduh data. | `InsightProvenanceDrawer.tsx` | `/app` → provenance drawer → download error alert |

### Basemap Selector

| Key | EN | FR | ES | PT | ID | Component(s) | How to Access |
|---|---|---|---|---|---|---|---|
| `basemap.title` | Basemap Style | Style de fond de carte | Estilo de mapa base | Estilo do mapa base | Gaya peta dasar | `BasemapSelector.tsx` | `/app` → map → basemap selector dropdown title |
| `basemap.light` | Light | Clair | Claro | Claro | Terang | `BasemapSelector.tsx` | `/app` → map → basemap selector → Light option |
| `basemap.satellite` | Satellite | Satellite | Satélite | Satélite | Satelit | `BasemapSelector.tsx` | `/app` → map → basemap selector → Satellite option |
| `basemap.dark` | Dark | Sombre | Oscuro | Escuro | Gelap | `BasemapSelector.tsx` | `/app` → map → basemap selector → Dark option |

### Map Area Controls

| Key | EN | FR | ES | PT | ID | Component(s) | How to Access |
|---|---|---|---|---|---|---|---|
| `map.tools` | Tools | Outils | Herramientas | Ferramentas | Alat | `MapAreaControls.tsx` | `/app` → map → tools section label |
| `map.uploadArea` | Upload area | Téléverser une zone | Subir área | Enviar área | Unggah area | `MapAreaControls.tsx` | `/app` → map → upload area button aria-label |
| `map.uploadAreaFromFile` | Upload area from file | Téléverser une zone depuis un fichier | Subir área desde archivo | Enviar área de um arquivo | Unggah area dari file | `MapAreaControls.tsx` | `/app` → map → upload button tooltip |
| `map.selectAreaOnMap` | Select area on map | Sélectionner une zone sur la carte | Seleccionar área en el mapa | Selecionar área no mapa | Pilih area di peta | `MapAreaControls.tsx` | `/app` → map → select area button tooltip |
| `map.selectAreaFromOptions` | Select area from options | Sélectionner une zone dans les options | Seleccionar área de las opciones | Selecionar área das opções | Pilih area dari opsi | `MapAreaControls.tsx` | `/app` → map → select area dropdown aria-label |
| `map.drawAreaOnMap` | Draw area on map | Dessiner une zone sur la carte | Dibujar área en el mapa | Desenhar área no mapa | Gambar area di peta | `MapAreaControls.tsx` | `/app` → map → draw area button tooltip |
| `map.cancelDrawing` | Cancel drawing | Annuler le dessin | Cancelar dibujo | Cancelar desenho | Batalkan gambar | `MapAreaControls.tsx` | `/app` → map → while drawing → cancel button tooltip |
| `map.confirmArea` | Confirm area | Confirmer la zone | Confirmar área | Confirmar área | Konfirmasi area | `MapAreaControls.tsx` | `/app` → map → while drawing → confirm button tooltip |
| `map.selectingMode` | Selecting {name} | Sélection de {name} | Seleccionando {name} | Selecionando {name} | Memilih {name} | `MapAreaControls.tsx` | `/app` → map → status bar while selecting |
| `map.drawingMode` | Drawing AOI | Dessin de la zone | Dibujando área | Desenhando área | Menggambar area | `MapAreaControls.tsx` | `/app` → map → status bar while drawing |
| `map.uploadingMode` | Uploading | Téléversement | Subiendo | Enviando | Mengunggah | `MapAreaControls.tsx` | `/app` → map → status bar while uploading |
| `map.errorAreaTooSmall` | Error: Area too small | Erreur : zone trop petite | Error: área demasiado pequeña | Erro: área muito pequena | Error: area terlalu kecil | `MapAreaControls.tsx` | `/app` → map → area validation error message |
| `map.errorAreaTooLarge` | Error: Area too large | Erreur : zone trop grande | Error: área demasiado grande | Erro: área muito grande | Error: area terlalu besar | `MapAreaControls.tsx` | `/app` → map → area validation error message |
| `map.minimumArea` | Minimum area | Surface minimale | Área mínima | Área mínima | Area minimum | `MapAreaControls.tsx` | `/app` → map → area size label (too small) |
| `map.maximumArea` | Maximum area | Surface maximale | Área máxima | Área máxima | Area maksimum | `MapAreaControls.tsx` | `/app` → map → area size label (too large) |
| `map.yourArea` | Your area | Votre zone | Tu área | Sua área | Area Anda | `MapAreaControls.tsx` | `/app` → map → user's drawn area size label |
| `map.closeValidationError` | Close area validation error | Fermer l'erreur de validation | Cerrar error de validación | Fechar erro de validação | Tutup error validasi | `MapAreaControls.tsx` | `/app` → map → close validation error button aria-label |

### Dataset Info Modal

| Key | EN | FR | ES | PT | ID | Component(s) | How to Access |
|---|---|---|---|---|---|---|---|
| `dataset.description` | Description | Description | Descripción | Descrição | Deskripsi | `DatasetInfoModal.tsx` | `/app` → click dataset info icon → Description tab |
| `dataset.methodology` | Methodology | Méthodologie | Metodología | Metodologia | Metodologi | `DatasetInfoModal.tsx` | `/app` → dataset info modal → Methodology tab |
| `dataset.cautions` | Cautions | Précautions | Precauciones | Precauções | Peringatan | `DatasetInfoModal.tsx` | `/app` → dataset info modal → Cautions tab |
| `dataset.citation` | Citation | Citation | Citación | Citação | Sitasi | `DatasetInfoModal.tsx` | `/app` → dataset info modal → Citation tab |

---

## 3. `dialogs.json` — Modals & Dialogs

### Delete Thread

| Key | EN | FR | ES | PT | ID | Component(s) | How to Access |
|---|---|---|---|---|---|---|---|
| `deleteThread.title` | Are you sure? | Êtes-vous sûr ? | ¿Estás seguro? | Tem certeza? | Apakah Anda yakin? | `ThreadDeleteDialog.tsx` | `/app` → sidebar → thread ⋯ menu → Delete → dialog title |
| `deleteThread.body` | This action cannot be undone. This will permanently delete the conversation {name} from our systems. | Cette action est irréversible. La conversation {name} sera définitivement supprimée de nos systèmes. | Esta acción no se puede deshacer. La conversación {name} será eliminada permanentemente de nuestros sistemas. | Esta ação não pode ser desfeita. A conversa {name} será permanentemente excluída dos nossos sistemas. | Tindakan ini tidak dapat dibatalkan. Percakapan {name} akan dihapus secara permanen dari sistem kami. | `ThreadDeleteDialog.tsx` | `/app` → delete dialog body text |

### Rename Thread

| Key | EN | FR | ES | PT | ID | Component(s) | How to Access |
|---|---|---|---|---|---|---|---|
| `renameThread.title` | Rename thread | Renommer la conversation | Renombrar conversación | Renomear conversa | Ganti nama percakapan | `ThreadRenameDialog.tsx` | `/app` → sidebar → thread ⋯ menu → Rename → dialog title |

### Share Thread

| Key | EN | FR | ES | PT | ID | Component(s) | How to Access |
|---|---|---|---|---|---|---|---|
| `shareThread.title` | Share Conversation | Partager la conversation | Compartir conversación | Compartilhar conversa | Bagikan percakapan | `ThreadShareDialog.tsx` | `/app` → sidebar → thread ⋯ menu → Share → dialog title |
| `shareThread.disclaimer` | Sharing creates a public, view-only link… | Le partage crée un lien public en lecture seule… | Compartir crea un enlace público de solo lectura… | Compartilhar cria um link público somente leitura… | Berbagi membuat tautan publik hanya-baca… | `ThreadShareDialog.tsx` | `/app` → share dialog disclaimer text |
| `shareThread.termsLink` | Terms of use | conditions d'utilisation | términos de uso | termos de uso | ketentuan penggunaan | `ThreadShareDialog.tsx` | `/app` → share dialog terms link |
| `shareThread.visibility` | Visibility | Visibilité | Visibilidad | Visibilidade | Visibilitas | `ThreadShareDialog.tsx` | `/app` → share dialog → visibility select label |
| `shareThread.private` | Private (only you can access) | Privé (vous seul pouvez y accéder) | Privado (solo tú puedes acceder) | Privado (somente você pode acessar) | Privat (hanya Anda yang dapat mengakses) | `ThreadShareDialog.tsx` | `/app` → share dialog → private option |
| `shareThread.public` | Public (anyone can access) | Public (tout le monde peut y accéder) | Público (cualquiera puede acceder) | Público (qualquer pessoa pode acessar) | Publik (siapa pun dapat mengakses) | `ThreadShareDialog.tsx` | `/app` → share dialog → public option |
| `shareThread.copyShareLink` | Copy share link | Copier le lien de partage | Copiar enlace de compartir | Copiar link de compartilhamento | Salin tautan berbagi | `ThreadShareDialog.tsx` | `/app` → share dialog → copy link button |
| `shareThread.linkCopied` | Link Copied | Lien copié | Enlace copiado | Link copiado | Tautan disalin | `ThreadShareDialog.tsx` | `/app` → after copying share link → button text changes |
| `shareThread.createShareLink` | Create share link | Créer un lien de partage | Crear enlace de compartir | Criar link de compartilhamento | Buat tautan berbagi | `ThreadShareDialog.tsx` | `/app` → share dialog → create link button (when private) |
| `shareThread.visibilityUpdated` | Visibility updated | Visibilité mise à jour | Visibilidad actualizada | Visibilidade atualizada | Visibilitas diperbarui | `ThreadShareDialog.tsx` | `/app` → change visibility → toast title |
| `shareThread.nowPublic` | Thread is now public | La conversation est maintenant publique | La conversación ahora es pública | A conversa agora é pública | Percakapan sekarang bersifat publik | `ThreadShareDialog.tsx` | `/app` → set public → toast description |
| `shareThread.nowPrivate` | Thread is now private | La conversation est maintenant privée | La conversación ahora es privada | A conversa agora é privada | Percakapan sekarang bersifat privat | `ThreadShareDialog.tsx` | `/app` → set private → toast description |
| `shareThread.visibilityFailed` | Visibility update failed | Échec de la mise à jour de la visibilité | Error al actualizar la visibilidad | Falha ao atualizar a visibilidade | Gagal memperbarui visibilitas | `ThreadShareDialog.tsx` | `/app` → visibility change fails → toast title |
| `shareThread.visibilityFailedDescription` | Please try again. | Veuillez réessayer. | Por favor, inténtalo de nuevo. | Por favor, tente novamente. | Silakan coba lagi. | `ThreadShareDialog.tsx` | `/app` → visibility change fails → toast description |

### Thread Actions Menu

| Key | EN | FR | ES | PT | ID | Component(s) | How to Access |
|---|---|---|---|---|---|---|---|
| `thread.actionsFor` | Thread actions for {name} | Actions pour la conversation {name} | Acciones para la conversación {name} | Ações para a conversa {name} | Tindakan untuk percakapan {name} | `ThreadActionsMenu.tsx` | `/app` → sidebar → thread ⋯ button aria-label |
| `thread.rename` | Rename | Renommer | Renombrar | Renomear | Ganti nama | `ThreadActionsMenu.tsx` | `/app` → sidebar → thread ⋯ menu → Rename |
| `thread.share` | Share | Partager | Compartir | Compartilhar | Bagikan | `ThreadActionsMenu.tsx` | `/app` → sidebar → thread ⋯ menu → Share |
| `thread.delete` | Delete | Supprimer | Eliminar | Excluir | Hapus | `ThreadActionsMenu.tsx`, `ThreadDeleteDialog.tsx` | `/app` → sidebar → thread ⋯ menu → Delete |

### Upload Dialog

| Key | EN | FR | ES | PT | ID | Component(s) | How to Access |
|---|---|---|---|---|---|---|---|
| `upload.title` | Upload Area | Téléverser une zone | Subir área | Enviar área | Unggah area | `UploadAreaDialog.tsx` | `/app` → map → upload area → dialog title |
| `upload.uploading` | Uploading Area... | Téléversement de la zone... | Subiendo área... | Enviando área... | Mengunggah area... | `UploadAreaDialog.tsx` | `/app` → upload dialog title while uploading |
| `upload.uploadButton` | Upload | Téléverser | Subir | Enviar | Unggah | `UploadAreaDialog.tsx` | `/app` → upload dialog → upload button |
| `upload.uploadingButton` | Uploading... | Téléversement... | Subiendo... | Enviando... | Mengunggah... | `UploadAreaDialog.tsx` | `/app` → upload dialog → button while uploading |
| `upload.termsPrefix` | By uploading data you agree to the | En téléversant des données, vous acceptez les | Al subir datos aceptas los | Ao enviar dados, você concorda com os | Dengan mengunggah data, Anda menyetujui | `UploadAreaDialog.tsx` | `/app` → upload dialog → terms text |
| `upload.termsLink` | terms of use | conditions d'utilisation | términos de uso | termos de uso | ketentuan penggunaan | `UploadAreaDialog.tsx` | `/app` → upload dialog → terms link |
| `upload.clear` | Clear | Effacer | Limpiar | Limpar | Bersihkan | `UploadAreaDialog.tsx` | `/app` → upload dialog → clear selected file |
| `upload.dropzone.dragAndDrop` | Drag and drop a polygon data file here or click to upload. | Glissez-déposez un fichier de données polygonales ici ou cliquez pour téléverser. | Arrastra y suelta un archivo de datos poligonales aquí o haz clic para subir. | Arraste e solte um arquivo de dados poligonais aqui ou clique para enviar. | Seret dan lepas file data poligon di sini atau klik untuk mengunggah. | `UploadAreaDialog.tsx` | `/app` → upload dialog → dropzone instruction text |
| `upload.dropzone.fileTypes` | Files with extension {types} up to {maxSize} MB | Fichiers avec extension {types} jusqu'à {maxSize} Mo | Archivos con extensión {types} hasta {maxSize} MB | Arquivos com extensão {types} até {maxSize} MB | File dengan ekstensi {types} hingga {maxSize} MB | `UploadAreaDialog.tsx` | `/app` → upload dialog → supported file types text |
| `upload.dropzone.selectFile` | Select File | Sélectionner un fichier | Seleccionar archivo | Selecionar arquivo | Pilih file | `UploadAreaDialog.tsx` | `/app` → upload dialog → file picker button |

---

## 4. `onboarding.json` — Onboarding Form

| Key | EN | FR | ES | PT | ID | Component(s) | How to Access |
|---|---|---|---|---|---|---|---|
| `title` | Complete your | Complétez votre | Completa tu | Complete seu | Lengkapi | `form.tsx` | `/onboarding` → page heading |
| `titleSuffix` | user profile | profil utilisateur | perfil de usuario | perfil de usuário | profil pengguna Anda | `form.tsx` | `/onboarding` → page heading (styled part) |
| `subtitle` | We use this information to make Global Nature Watch more useful to you… | Nous utilisons ces informations pour rendre Global Nature Watch plus utile pour vous… | Usamos esta información para hacer Global Nature Watch más útil para ti… | Usamos essas informações para tornar o Global Nature Watch mais útil para você… | Kami menggunakan informasi ini untuk membuat Global Nature Watch lebih berguna bagi Anda… | `form.tsx` | `/onboarding` → subtitle below heading |
| `goBack` | Go back | Retour | Volver | Voltar | Kembali | `form.tsx` | `/onboarding` → back link at top |
| `fields.firstName` | First name | Prénom | Nombre | Nome | Nama depan | `form.tsx`, `dashboard/page.tsx` | `/onboarding` or `/dashboard` → first name field label |
| `fields.lastName` | Last name | Nom | Apellido | Sobrenome | Nama belakang | `form.tsx`, `dashboard/page.tsx` | `/onboarding` or `/dashboard` → last name field label |
| `fields.email` | Email address | Adresse e-mail | Correo electrónico | Endereço de e-mail | Alamat email | `form.tsx`, `dashboard/page.tsx` | `/onboarding` or `/dashboard` → email field label |
| `fields.sector` | Sector | Secteur | Sector | Setor | Sektor | `form.tsx`, `dashboard/page.tsx` | `/onboarding` or `/dashboard` → sector dropdown label |
| `fields.role` | Role | Rôle | Rol | Função | Peran | `form.tsx`, `dashboard/page.tsx` | `/onboarding` or `/dashboard` → role dropdown label |
| `fields.jobTitle` | Job title | Titre du poste | Cargo | Cargo | Jabatan | `form.tsx`, `dashboard/page.tsx` | `/onboarding` or `/dashboard` → job title field label |
| `fields.company` | Company / Organization | Entreprise / Organisation | Empresa / Organización | Empresa / Organização | Perusahaan / Organisasi | `form.tsx`, `dashboard/page.tsx` | `/onboarding` or `/dashboard` → company field label |
| `fields.country` | Country | Pays | País | País | Negara | `form.tsx`, `dashboard/page.tsx` | `/onboarding` or `/dashboard` → country dropdown label |
| `fields.expertise` | Level of technical expertise | Niveau d'expertise technique | Nivel de experiencia técnica | Nível de experiência técnica | Tingkat keahlian teknis | `form.tsx`, `dashboard/page.tsx` | `/onboarding` or `/dashboard` → expertise dropdown label |
| `fields.preferredLanguage` | Preferred language | Langue préférée | Idioma preferido | Idioma preferido | Bahasa pilihan | `form.tsx`, `dashboard/page.tsx` | `/onboarding` or `/dashboard` → language dropdown label |
| `fields.languageNote` | Please note most of our communications are in English. | Veuillez noter que la plupart de nos communications sont en anglais. | Ten en cuenta que la mayoría de nuestras comunicaciones son en inglés. | Observe que a maioria das nossas comunicações são em inglês. | Perlu diketahui bahwa sebagian besar komunikasi kami dalam bahasa Inggris. | `form.tsx`, `dashboard/page.tsx` | `/onboarding` or `/dashboard` → note below language dropdown |
| `fields.topics` | What topic(s) are you most interested in? | Quel(s) sujet(s) vous intéresse(nt) le plus ? | ¿Qué tema(s) te interesan más? | Qual(is) tema(s) mais lhe interessa(m)? | Topik apa yang paling Anda minati? | `form.tsx`, `dashboard/page.tsx` | `/onboarding` or `/dashboard` → topics checkbox group label |
| `placeholders.sector` | Select Sector | Sélectionner le secteur | Seleccionar sector | Selecionar setor | Pilih sektor | `form.tsx`, `dashboard/page.tsx` | `/onboarding` or `/dashboard` → sector dropdown placeholder |
| `placeholders.role` | Select Role | Sélectionner le rôle | Seleccionar rol | Selecionar função | Pilih peran | `form.tsx`, `dashboard/page.tsx` | `/onboarding` or `/dashboard` → role dropdown placeholder |
| `placeholders.country` | Select Country | Sélectionner le pays | Seleccionar país | Selecionar país | Pilih negara | `form.tsx`, `dashboard/page.tsx` | `/onboarding` or `/dashboard` → country dropdown placeholder |
| `placeholders.expertise` | Select Level | Sélectionner le niveau | Seleccionar nivel | Selecionar nível | Pilih tingkat | `form.tsx`, `dashboard/page.tsx` | `/onboarding` or `/dashboard` → expertise dropdown placeholder |
| `placeholders.language` | Select Language | Sélectionner la langue | Seleccionar idioma | Selecionar idioma | Pilih bahasa | `form.tsx`, `dashboard/page.tsx` | `/onboarding` or `/dashboard` → language dropdown placeholder |
| `emailConsent` | By creating an account, you agree to receive essential emails… | En créant un compte, vous acceptez de recevoir des e-mails essentiels… | Al crear una cuenta, aceptas recibir correos electrónicos esenciales… | Ao criar uma conta, você concorda em receber e-mails essenciais… | Dengan membuat akun, Anda setuju untuk menerima email penting… | `form.tsx` | `/onboarding` → consent text above checkboxes |
| `checkboxes.receiveNews` | Send me news, resources, and opportunities from Land & Carbon Lab. | Envoyez-moi des nouvelles, ressources et opportunités de Land & Carbon Lab. | Envíenme noticias, recursos y oportunidades de Land & Carbon Lab. | Enviem-me notícias, recursos e oportunidades do Land & Carbon Lab. | Kirimkan saya berita, sumber daya, dan peluang dari Land & Carbon Lab. | `form.tsx` | `/onboarding` → newsletter opt-in checkbox |
| `checkboxes.helpTest` | Contact me about testing new features. | Contactez-moi pour tester de nouvelles fonctionnalités. | Contáctenme para probar nuevas funciones. | Entrem em contato comigo para testar novos recursos. | Hubungi saya untuk menguji fitur baru. | `form.tsx` | `/onboarding` → testing opt-in checkbox |
| `terms.iAccept` | I accept the | J'accepte les | Acepto los | Aceito os | Saya menerima | `form.tsx` | `/onboarding` → terms acceptance prefix |
| `terms.termsOfUse` | Terms of Use | Conditions d'utilisation | Términos de uso | Termos de Uso | Ketentuan Penggunaan | `form.tsx` | `/onboarding` → terms of use link text |
| `terms.and` | and | et | y | e | dan | `form.tsx` | `/onboarding` → conjunction in terms text |
| `terms.aiTermsOfUse` | Global Nature Watch AI Terms of Use | Conditions d'utilisation IA de Global Nature Watch | Términos de uso IA de Global Nature Watch | Termos de Uso IA do Global Nature Watch | Ketentuan Penggunaan AI Global Nature Watch | `form.tsx` | `/onboarding` → AI terms link text |
| `terms.acknowledge` | and I acknowledge the privacy practices described in the | et je reconnais les pratiques de confidentialité décrites dans la | y reconozco las prácticas de privacidad descritas en la | e reconheço as práticas de privacidade descritas na | dan saya mengakui praktik privasi yang dijelaskan dalam | `form.tsx` | `/onboarding` → privacy acknowledgement text |
| `terms.privacyPolicy` | Privacy Policy | Politique de confidentialité | Política de privacidad | Política de Privacidade | Kebijakan Privasi | `form.tsx` | `/onboarding` → privacy policy link text |
| `terms.andThe` | and the | et la | y la | e na | dan | `form.tsx` | `/onboarding` → conjunction in terms text |
| `terms.aiPrivacyPolicy` | Global Nature Watch AI Privacy Policy | Politique de confidentialité IA de Global Nature Watch | Política de privacidad IA de Global Nature Watch | Política de Privacidade IA do Global Nature Watch | Kebijakan Privasi AI Global Nature Watch | `form.tsx` | `/onboarding` → AI privacy policy link text |
| `completeProfile` | Complete profile | Terminer le profil | Completar perfil | Completar perfil | Selesaikan profil | `form.tsx` | `/onboarding` → submit button |
| `finalizingProfile` | Finalizing profile... | Finalisation du profil... | Finalizando perfil... | Finalizando perfil... | Menyelesaikan profil... | `form.tsx` | `/onboarding` → submit button loading state |

---

## 5. `dashboard.json` — Dashboard / Settings

| Key | EN | FR | ES | PT | ID | Component(s) | How to Access |
|---|---|---|---|---|---|---|---|
| `userSettings` | User Settings | Paramètres utilisateur | Configuración de usuario | Configurações do usuário | Pengaturan Pengguna | `dashboard/page.tsx` | `/dashboard` → page heading |
| `saveChanges` | Save changes | Enregistrer les modifications | Guardar cambios | Salvar alterações | Simpan perubahan | `dashboard/page.tsx` | `/dashboard` → save button |
| `backToApp` | Back to Application | Retour à l'application | Volver a la aplicación | Voltar ao aplicativo | Kembali ke aplikasi | `dashboard/page.tsx` | `/dashboard` → back to app link |
| `signOut` | Sign Out | Déconnexion | Cerrar sesión | Sair | Keluar | `dashboard/page.tsx` | `/dashboard` → sign out button |
| `additionalDetails` | Additional Details (Optional) | Détails supplémentaires (facultatif) | Detalles adicionales (opcional) | Detalhes adicionais (opcional) | Detail tambahan (opsional) | `dashboard/page.tsx` | `/dashboard` → additional details section heading |
| `profileSaved` | Profile saved | Profil enregistré | Perfil guardado | Perfil salvo | Profil disimpan | `dashboard/page.tsx` | `/dashboard` → save success → toast title |
| `profileSavedDescription` | Your changes have been saved successfully. | Vos modifications ont été enregistrées avec succès. | Tus cambios se han guardado correctamente. | Suas alterações foram salvas com sucesso. | Perubahan Anda berhasil disimpan. | `dashboard/page.tsx` | `/dashboard` → save success → toast description |
| `saveFailed` | Save failed | Échec de l'enregistrement | Error al guardar | Falha ao salvar | Gagal menyimpan | `dashboard/page.tsx` | `/dashboard` → save error → toast title |
| `saveFailedDescription` | Unable to save profile. | Impossible d'enregistrer le profil. | No se pudo guardar el perfil. | Não foi possível salvar o perfil. | Tidak dapat menyimpan profil. | `dashboard/page.tsx` | `/dashboard` → save error → toast description |

---

## 6. `errors.json` — Error & Status Pages

### 404 Not Found

| Key | EN | FR | ES | PT | ID | Component(s) | How to Access |
|---|---|---|---|---|---|---|---|
| `notFound.title` | Page not found | Page introuvable | Página no encontrada | Página não encontrada | Halaman tidak ditemukan | `not-found.tsx` | Navigate to any invalid URL |
| `notFound.description` | The link you entered does not exist. Please check the link or visit our | Le lien que vous avez saisi n'existe pas. Veuillez vérifier le lien ou visiter notre | El enlace que ingresaste no existe. Por favor verifica el enlace o visita nuestra | O link que você digitou não existe. Verifique o link ou visite nossa | Tautan yang Anda masukkan tidak ada. Silakan periksa tautan atau kunjungi | `not-found.tsx` | 404 page body text |
| `notFound.homeLink` | home page | page d'accueil | página de inicio | página inicial | halaman beranda | `not-found.tsx` | 404 page → home link text |

### Maintenance

| Key | EN | FR | ES | PT | ID | Component(s) | How to Access |
|---|---|---|---|---|---|---|---|
| `maintenance.title` | The site is currently down for maintenance | Le site est actuellement en maintenance | El sitio está en mantenimiento | O site está em manutenção | Situs sedang dalam pemeliharaan | `maintenance/page.tsx` | `/maintenance` → page heading |
| `maintenance.description` | Sorry for any inconvenience. Please check back shortly! | Désolé pour la gêne occasionnée. Veuillez réessayer sous peu ! | Disculpa las molestias. ¡Por favor, inténtalo de nuevo en breve! | Desculpe pelo inconveniente. Por favor, tente novamente em breve! | Maaf atas ketidaknyamanannya. Silakan coba lagi nanti! | `maintenance/page.tsx` | `/maintenance` → page description |

### Unauthorized

| Key | EN | FR | ES | PT | ID | Component(s) | How to Access |
|---|---|---|---|---|---|---|---|
| `unauthorized.earlyAccess` | Early access only | Accès anticipé uniquement | Solo acceso anticipado | Apenas acesso antecipado | Hanya akses awal | `unauthorized/page.tsx` | `/unauthorized` → heading (early access scenario) |
| `unauthorized.accessDenied` | Access Denied | Accès refusé | Acceso denegado | Acesso negado | Akses ditolak | `unauthorized/page.tsx` | `/unauthorized` → heading (access denied scenario) |
| `unauthorized.comingSoon` | Coming soon | Bientôt disponible | Próximamente | Em breve | Segera hadir | `unauthorized/page.tsx` | `/unauthorized` → heading (coming soon scenario) |
| `unauthorized.earlyAccessThanks` | Thank you for your interest in Global Nature Watch! | Merci de votre intérêt pour Global Nature Watch ! | ¡Gracias por tu interés en Global Nature Watch! | Obrigado pelo seu interesse no Global Nature Watch! | Terima kasih atas minat Anda pada Global Nature Watch! | `unauthorized/page.tsx` | `/unauthorized` → early access intro text |
| `unauthorized.earlyAccessBody` | Right now access is limited while we are in closed preview… | L'accès est actuellement limité pendant la phase d'aperçu fermé… | El acceso está actualmente limitado durante la fase de vista previa cerrada… | O acesso está atualmente limitado durante a fase de pré-visualização fechada… | Akses saat ini terbatas selama fase pratinjau tertutup… | `unauthorized/page.tsx` | `/unauthorized` → early access body text |
| `unauthorized.accessDeniedBody` | We were unable to verify your access to Global Nature Watch… | Nous n'avons pas pu vérifier votre accès à Global Nature Watch… | No pudimos verificar tu acceso a Global Nature Watch… | Não foi possível verificar seu acesso ao Global Nature Watch… | Kami tidak dapat memverifikasi akses Anda ke Global Nature Watch… | `unauthorized/page.tsx` | `/unauthorized` → access denied body text |
| `unauthorized.comingSoonBody` | Thank you for creating a Global Nature Watch account… | Merci d'avoir créé un compte Global Nature Watch… | Gracias por crear una cuenta en Global Nature Watch… | Obrigado por criar uma conta no Global Nature Watch… | Terima kasih telah membuat akun Global Nature Watch… | `unauthorized/page.tsx` | `/unauthorized` → coming soon body text |
| `unauthorized.backToHomepage` | Back to homepage | Retour à l'accueil | Volver al inicio | Voltar à página inicial | Kembali ke beranda | `unauthorized/page.tsx` | `/unauthorized` → back link |
| `unauthorized.joinWaitlist` | Join waitlist | Rejoindre la liste d'attente | Unirse a la lista de espera | Entrar na lista de espera | Gabung daftar tunggu | `unauthorized/page.tsx` | `/unauthorized` → waitlist CTA button |
| `unauthorized.failedLoadSignup` | Failed to load signup status | Échec du chargement du statut d'inscription | Error al cargar el estado de registro | Falha ao carregar status do cadastro | Gagal memuat status pendaftaran | `unauthorized/page.tsx` | `/unauthorized` → signup status error → toast title |
| `unauthorized.failedLoadSignupDescription` | Unable to check if signup is currently open. Please try again later. | Impossible de vérifier si l'inscription est actuellement ouverte. Veuillez réessayer plus tard. | No se pudo verificar si el registro está abierto actualmente. Por favor, inténtalo más tarde. | Não foi possível verificar se o cadastro está aberto no momento. Tente novamente mais tarde. | Tidak dapat memeriksa apakah pendaftaran sedang dibuka. Silakan coba lagi nanti. | `unauthorized/page.tsx` | `/unauthorized` → signup status error → toast description |
