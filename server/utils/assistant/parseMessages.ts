import { safeValidateUIMessages, type UIMessage } from 'ai';

export async function parseStoredUiMessages(
  rows: { id: string; role: string; partsJson: string }[],
): Promise<UIMessage[]> {
  const candidates = rows.map((row) => {
    let parts: unknown = [];
    try {
      parts = JSON.parse(row.partsJson);
    }
    catch {
      parts = [];
    }
    return {
      id: row.id,
      role: row.role,
      parts: Array.isArray(parts) ? parts : [],
    };
  });

  const result = await safeValidateUIMessages({ messages: candidates });
  if (!result.success)
    return [];
  return result.data;
}

export async function parseRequestUiMessages(messages: unknown[]): Promise<UIMessage[]> {
  const result = await safeValidateUIMessages({ messages });
  if (!result.success)
    throw createError({
      statusCode: 422,
      statusMessage: 'Invalid chat messages',
      data: [['messages', 'Could not validate chat message payload']],
    });
  
  return result.data;
}

export function isPersistableRole(
  role: UIMessage['role'],
): role is 'user' | 'assistant' | 'system' {
  return role === 'user' || role === 'assistant' || role === 'system';
}