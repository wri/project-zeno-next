import { defaultLocale } from "./config";

/**
 * Welcome messages displayed as the first system message in a new chat thread.
 * Keyed by language code. Each translation preserves the same markdown
 * structure, links, and meaning as the English original.
 *
 * These are kept separate from the next-intl JSON files because the chatStore
 * needs them synchronously before the i18n provider is mounted.
 */
const WELCOME_MESSAGES: Record<string, string> = {
  en: `**Welcome to Global Nature Watch!**
      &nbsp;
      Hi, I'm your nature monitoring assistant, powered by AI and open data from [Global Forest Watch](https://globalforestwatch.org) and [Land & Carbon Lab](https://landcarbonlab.org).
      &nbsp;
      You can ask me about land cover change, forest loss, or biodiversity risks in places you care about. For more details on how to get started, check out the [Help Center](https://help.globalnaturewatch.org/get-started).`,

  fr: `**Bienvenue sur Global Nature Watch !**
      &nbsp;
      Bonjour, je suis votre assistant de suivi de la nature, alimenté par l'IA et les données ouvertes de [Global Forest Watch](https://globalforestwatch.org) et du [Land & Carbon Lab](https://landcarbonlab.org).
      &nbsp;
      Vous pouvez me poser des questions sur les changements de couverture terrestre, la perte de forêts ou les risques pour la biodiversité dans les zones qui vous intéressent. Pour en savoir plus, consultez le [Centre d'aide](https://help.globalnaturewatch.org/get-started).`,

  es: `**¡Bienvenido a Global Nature Watch!**
      &nbsp;
      Hola, soy tu asistente de monitoreo de la naturaleza, impulsado por IA y datos abiertos de [Global Forest Watch](https://globalforestwatch.org) y [Land & Carbon Lab](https://landcarbonlab.org).
      &nbsp;
      Puedes preguntarme sobre cambios en la cobertura terrestre, pérdida de bosques o riesgos para la biodiversidad en los lugares que te importan. Para más detalles sobre cómo empezar, consulta el [Centro de ayuda](https://help.globalnaturewatch.org/get-started).`,

  pt: `**Bem-vindo ao Global Nature Watch!**
      &nbsp;
      Olá, sou o seu assistente de monitoramento da natureza, alimentado por IA e dados abertos do [Global Forest Watch](https://globalforestwatch.org) e do [Land & Carbon Lab](https://landcarbonlab.org).
      &nbsp;
      Você pode me perguntar sobre mudanças na cobertura do solo, perda de florestas ou riscos à biodiversidade nos lugares que você se preocupa. Para mais detalhes sobre como começar, confira a [Central de Ajuda](https://help.globalnaturewatch.org/get-started).`,

  id: `**Selamat datang di Global Nature Watch!**
      &nbsp;
      Halo, saya asisten pemantauan alam Anda, didukung oleh AI dan data terbuka dari [Global Forest Watch](https://globalforestwatch.org) dan [Land & Carbon Lab](https://landcarbonlab.org).
      &nbsp;
      Anda dapat bertanya kepada saya tentang perubahan tutupan lahan, kehilangan hutan, atau risiko keanekaragaman hayati di tempat-tempat yang Anda pedulikan. Untuk informasi lebih lanjut tentang cara memulai, kunjungi [Pusat Bantuan](https://help.globalnaturewatch.org/get-started).`,
};

/**
 * Returns the welcome message for the given language code, falling back to
 * English if the code is not recognized.
 */
export function getWelcomeMessage(lang?: string | null): string {
  return (
    WELCOME_MESSAGES[lang ?? defaultLocale] ?? WELCOME_MESSAGES[defaultLocale]
  );
}
