import express from "express";
import fetch from "node-fetch";
import admin from "firebase-admin";

const app = express();
app.use(express.json());

// === FIREBASE SETUP ===
import serviceAccount from "./serviceAccountKey.json" assert { type: "json" };
admin.initializeApp({
  credential: admin.credential.cert(serviceAccount)
});
const db = admin.firestore();

// === CEK USER VALID ===
app.post("/ask", async (req, res) => {
  const { password, prompt } = req.body;
  const userDoc = await db.collection("users").doc(password).get();

  if (!userDoc.exists) return res.json({ reply: "❌ Password salah." });
  const data = userDoc.data();
  const now = Date.now();

  if (now > data.expired) {
    return res.json({
      reply: "⚠️ Masa aktif sudah habis. Silakan perpanjang 10k/bulan ke 085830074000."
    });
  }

  // === Kirim pertanyaan ke Ollama ===
  try {
    const aiRes = await fetch("http://localhost:11434/api/generate", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ model: data.model || "llama3", prompt })
    });
    const aiData = await aiRes.json();
    res.json({ reply: aiData.response });
  } catch (err) {
    res.json({ reply: "⚙️ Server AI sedang dinyalakan, coba lagi dalam 10 detik." });
    // kamu bisa tambahkan script pemicu hidupkan ollama serve di sini
  }
});

// === TAMBAH USER (admin only) ===
app.post("/add-user", async (req, res) => {
  const { password, days, model } = req.body;
  const expired = Date.now() + days * 24 * 60 * 60 * 1000;
  await db.collection("users").doc(password).set({ expired, model });
  res.json({ success: true });
});

app.listen(3000, () => console.log("API running on port 3000"));
