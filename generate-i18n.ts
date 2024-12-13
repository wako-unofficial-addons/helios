import { execSync } from 'child_process';
import * as deepl from 'deepl-node';
import { existsSync, readFileSync, writeFileSync } from 'fs';

declare type Message = Record<string, string>;
declare type Format = 'arb' | 'json';

let sourceLocale = 'en';

function getSourceMessages({ path, filename }: { path: string; filename: string }) {
  return getMessages({ filePath: `${path}/${filename}` });
}

function getMessagesPathByLocale({ path, locale, format = 'json' }: { path: string; locale: string; format?: Format }) {
  if (format === 'arb') {
    return `${path}/messages.${locale}.arb`;
  }
  return `${path}/${locale}.json`;
}

function getMessagesByLocale({ path, locale, format }: { path: string; locale: string; format: Format }): Message {
  const filePath = getMessagesPathByLocale({ path, locale, format });

  return getMessages({ filePath });
}

function getMessages({ filePath }: { filePath: string }): Message {
  if (!existsSync(filePath)) {
    console.log('File does not exist', filePath);
    return {};
  }

  const data = readFileSync(filePath, 'utf8');

  if (!data) {
    return {};
  }

  const messages = JSON.parse(data);

  return messages;
}

function setMessagesByLocale({
  path,
  locale,
  messages,
  format,
}: {
  path: string;
  locale: string;
  messages: Message;
  format: Format;
}) {
  const data = JSON.stringify(messages, null, 2);

  writeFileSync(getMessagesPathByLocale({ path, locale, format }), data, 'utf8');
}

function removeDeletedTranslations({
  sourceMessages,
  targetMessages,
}: {
  sourceMessages: Message;
  targetMessages: Message;
}) {
  const newTargetMessages: Record<string, string> = {};
  for (const [key] of Object.entries(sourceMessages)) {
    if (targetMessages[key]) {
      newTargetMessages[key] = targetMessages[key];
    }
  }
  return newTargetMessages;
}

function sortMessageLikeSourceMessage({
  sourceMessages,
  targetMessages,
}: {
  sourceMessages: Message;
  targetMessages: Message;
}) {
  const newTargetMessages: Record<string, string> = {};
  for (const [key] of Object.entries(sourceMessages)) {
    if (targetMessages[key]) {
      newTargetMessages[key] = targetMessages[key];
    }
  }
  return newTargetMessages;
}

async function flattenFile(filePath: string) {
  const data = readFileSync(filePath, 'utf8');
  const messages = JSON.parse(data);

  function flattenObject(entries: [string, any][]) {
    const result: Record<string, string> = {};

    function flatten(obj: any, prefix = '') {
      for (const [key, value] of Object.entries(obj)) {
        const newKey = prefix ? `${prefix}.${key}` : key;

        if (typeof value === 'object' && value !== null) {
          flatten(value, newKey);
        } else {
          result[newKey] = value as string;
        }
      }
    }

    for (const [key, value] of entries) {
      flatten(value, key);
    }

    return result;
  }

  // Sort by name
  const sortedMessages = Object.entries(messages).sort((a, b) => a[0].localeCompare(b[0]));

  return flattenObject(sortedMessages);
}

async function flattenAllFiles(options: { i18nFilesPath: string; locales: string[] }) {
  for (const locale of options.locales) {
    const filePath = options.i18nFilesPath + '/' + locale + '.json';
    const sourceMessages = await flattenFile(filePath);
    writeFileSync(filePath, JSON.stringify(sourceMessages, null, 2), 'utf8');
  }
}

export default async function runExecutor(options: {
  i18nFilesPath: string;
  sourceLocaleFileName?: string;
  sourceLocale?: string;
  format?: Format;
  locales: string[];
}) {
  if (!process.env.DEEPL_API_KEY) {
    throw new Error('DEEPL_API_KEY is not set');
  }
  const translator = new deepl.Translator(process.env.DEEPL_API_KEY);

  const format = options.format ?? 'json';

  let sourceMessages = getSourceMessages({
    path: options.i18nFilesPath,
    filename: options.sourceLocaleFileName ?? 'messages.json',
  });

  // Convert back to Record<string, string>
  sourceMessages = Object.entries(sourceMessages)
    .sort((a, b) => a[0].localeCompare(b[0]))
    .reduce(
      (acc, [key, value]) => {
        acc[key] = value;
        return acc;
      },
      {} as Record<string, string>,
    );

  setMessagesByLocale({
    path: options.i18nFilesPath,
    locale: options.sourceLocale,
    messages: sourceMessages,
    format,
  });

  if (options.sourceLocale) {
    sourceLocale = options.sourceLocale;
  }

  console.log(`Processing source locale ${sourceLocale}`);
  console.log(`Locales to translate to: ${options.locales.join(', ')}`);

  for (const locale of options.locales) {
    let deeplLocal = locale;
    if (deeplLocal === 'en') {
      deeplLocal = 'en-US';
    }
    console.log(`Translating to locale ${locale}`);

    const targetMessages = getMessagesByLocale({ path: options.i18nFilesPath, locale, format });

    // Remove duplicate and save file to disk
    const newTargetMessages = removeDeletedTranslations({ sourceMessages, targetMessages });
    setMessagesByLocale({ path: options.i18nFilesPath, locale, messages: newTargetMessages, format });

    let newTranslatedMessages = 0;
    for (const [key, value] of Object.entries(sourceMessages)) {
      if (format === 'arb' && key.startsWith('@')) {
        if (key === '@@locale') {
          newTargetMessages[key] = locale;
        } else {
          newTargetMessages[key] = value;
        }

        continue;
      }

      if (!newTargetMessages[key]) {
        // Replace all variables present in the text between { and } by {XX_count_XX} to avoid deepl to translate them
        let valueWithReplacedVariables = value;
        const variables = value.match(/{.*?}/g);
        if (variables) {
          let i = 0;
          for (const variable of variables) {
            valueWithReplacedVariables = value.replace(variable, `{XX_${i++}}`);
          }
        }

        const translationResult = await translator.translateText(
          valueWithReplacedVariables,
          sourceLocale as deepl.SourceLanguageCode,
          deeplLocal as deepl.TargetLanguageCode,
        );

        let translatedText = translationResult.text;

        // Put the variable back
        if (variables) {
          let i = 0;
          for (const variable of variables) {
            translatedText = translationResult.text.replace(`{XX_${i++}}`, variable);
          }
        }

        newTargetMessages[key] = translatedText;
        newTranslatedMessages++;

        // Save every new translation just in case the script crashes or is interrupted
        setMessagesByLocale({ path: options.i18nFilesPath, locale, messages: newTargetMessages, format });
      }
    }

    // Save file with sorted keys for easier diffing
    setMessagesByLocale({
      path: options.i18nFilesPath,
      locale,
      messages: sortMessageLikeSourceMessage({ sourceMessages, targetMessages: newTargetMessages }),
      format,
    });

    // Format with prettier
    execSync(
      `prettier --ignore-unknown --write "${getMessagesPathByLocale({ path: options.i18nFilesPath, locale, format })}"`,
      {
        stdio: 'inherit',
      },
    );

    console.log(`Done processing locale ${locale} with ${newTranslatedMessages} new translations`);
  }

  return { success: true };
}

// flattenAllFiles({
//   i18nFilesPath: __dirname + '/projects/plugin/src/i18n',
//   locales: ['en', 'ar', 'el', 'fr', 'it'],
// });

runExecutor({
  i18nFilesPath: __dirname + '/projects/plugin/src/i18n',
  sourceLocaleFileName: 'en.json',
  sourceLocale: 'en',
  format: 'json',
  locales: ['ar', 'de', 'el', 'es', 'fr', 'it', 'nl', 'pl', 'pt-PT', 'pt-BR', 'ru'],
});
