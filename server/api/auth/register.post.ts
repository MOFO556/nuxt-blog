import { useSafeReadValidateBody } from "~~/server/composable/useSafeReadValidateBody";
import { users } from "~~/server/database/schema";
import { userInsertSchema } from "~~/server/database/users.validators";

export default defineEventHandler(async event => {
  
  const input = await useSafeReadValidateBody(event, userInsertSchema);

  const user = await useDb().transaction((tx) => {    
    let newUser = tx.insert(users).values(input).returning().get();
    
    if (!newUser)
      throw createError({ statusCode: 422, statusMessage: 'Could not create user' });

    if (input.authMethod === 'password') {
      return { user: newUser, token: signToken(newUser.id), passkey: null };
    }
  })


  if (!user)
      throw createError({ statusCode: 422, statusMessage: 'Wrong credentials' });
  else 
    return user;
})