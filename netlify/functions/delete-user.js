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
        body: JSON.stringify({
          erro: "Método não permitido"
        })
      };
    }

    iniciarFirebase();

    const dados = JSON.parse(event.body || "{}");

    const username = String(dados.username || "").trim().toLowerCase();

    if (!username) {
      return {
        statusCode: 400,
        body: JSON.stringify({
          erro: "Usuário não informado."
        })
      };
    }

    const db = admin.firestore();

    const docRef = db.collection("usuarios").doc(username);
    const docSnap = await docRef.get();

    if (!docSnap.exists) {
      return {
        statusCode: 404,
        body: JSON.stringify({
          erro: "Usuário não encontrado."
        })
      };
    }

    const dadosUsuario = docSnap.data();
    const authUid = dadosUsuario.authUid;

    // Exclui do Firebase Authentication
    if (authUid) {
      try {
        await admin.auth().deleteUser(authUid);
      } catch (erroAuth) {
        // Se a conta já não existir no Authentication,
        // continua para excluir o cadastro do Firestore.
        if (erroAuth.code !== "auth/user-not-found") {
          throw erroAuth;
        }
      }
    }

    // Exclui do Firestore
    await docRef.delete();

    return {
      statusCode: 200,
      body: JSON.stringify({
        sucesso: true,
        mensagem: `Usuário @${username} excluído com sucesso.`
      })
    };

  } catch (erro) {
    console.error(erro);

    return {
      statusCode: 500,
      body: JSON.stringify({
        erro: "Erro ao excluir usuário."
      })
    };
  }
};
