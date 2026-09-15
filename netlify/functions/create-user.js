const admin = require("firebase-admin");

function iniciarFirebase() {
  if (!admin.apps.length) {
    admin.initializeApp({
      credential: admin.credential.cert({
        projectId: process.env.FIREBASE_PROJECT_ID,
        clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
        privateKey: process.env.FIREBASE_PRIVATE_KEY.replace(/\\n/g, "\n")
      })
    });
  }
}

exports.handler = async function(event) {
  try {
    if (event.httpMethod !== "POST") {
      return {
        statusCode: 405,
        body: JSON.stringify({ erro: "Método não permitido" })
      };
    }

    iniciarFirebase();

    const dados = JSON.parse(event.body || "{}");

    const username = String(dados.username || "").trim().toLowerCase();
    const password = String(dados.password || "");
    const nome = String(dados.nome || "");
    const role = String(dados.role || "operador");

    if (!username || !password || !nome) {
      return {
        statusCode: 400,
        body: JSON.stringify({
          erro: "Usuário, senha e nome são obrigatórios."
        })
      };
    }

    if (password.length < 6) {
      return {
        statusCode: 400,
        body: JSON.stringify({
          erro: "A senha deve ter pelo menos 6 caracteres."
        })
      };
    }

    const email = `${username}@sistema-cfoc.local`;

    const usuarioAuth = await admin.auth().createUser({
      email: email,
      password: password,
      displayName: nome
    });

    await admin.firestore().collection("usuarios").doc(username).set({
      id: username,
      username: username,
      nome: nome,
      role: role,
      authUid: usuarioAuth.uid,
      emailAuth: email,
      criadoEm: new Date().toISOString()
    });

    return {
      statusCode: 200,
      body: JSON.stringify({
        sucesso: true,
        mensagem: `Usuário @${username} criado com sucesso.`,
        uid: usuarioAuth.uid
      })
    };

  } catch (erro) {
    console.error(erro);

    let mensagem = "Erro ao criar usuário.";

    if (erro.code === "auth/email-already-exists") {
      mensagem = "Esse usuário já possui uma conta no Firebase Authentication.";
    }

    return {
      statusCode: 400,
      body: JSON.stringify({
        erro: mensagem
      })
    };
  }
};
