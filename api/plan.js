const { MongoClient } = require("mongodb");

const DOC_ID = "azra-plan";

let clientPromise = global._mongoClientPromise;
function getClient() {
  if (!process.env.MONGODB_URI) throw new Error("MONGODB_URI tanımlı değil");
  if (!clientPromise) {
    clientPromise = new MongoClient(process.env.MONGODB_URI, { maxPoolSize: 5 }).connect();
    global._mongoClientPromise = clientPromise;
  }
  return clientPromise;
}

module.exports = async (req, res) => {
  res.setHeader("Cache-Control", "no-store");
  try {
    const col = (await getClient()).db("calisma_plani").collection("planlar");

    if (req.method === "GET") {
      const doc = await col.findOne({ _id: DOC_ID });
      return res.status(200).json(doc ? { name: doc.name || "", tasks: doc.tasks || [] } : null);
    }

    if (req.method === "PUT") {
      const b = req.body || {};
      if (!Array.isArray(b.tasks) || b.tasks.length > 5000) {
        return res.status(400).json({ error: "Geçersiz veri" });
      }
      const tasks = b.tasks.map((t) => ({
        id: String(t.id || "").slice(0, 40),
        date: String(t.date || "").slice(0, 10),
        sub: String(t.sub || "").slice(0, 20),
        title: String(t.title || "").slice(0, 200),
        done: !!t.done,
        ...(t.pc ? { pc: Number(t.pc) || 0 } : {}),
      }));
      const name = String(b.name || "").slice(0, 40);
      await col.updateOne(
        { _id: DOC_ID },
        { $set: { name, tasks, updatedAt: new Date() } },
        { upsert: true }
      );
      return res.status(200).json({ ok: true });
    }

    res.setHeader("Allow", "GET, PUT");
    return res.status(405).json({ error: "Method not allowed" });
  } catch (e) {
    console.error(e);
    return res.status(500).json({ error: "Sunucu hatası" });
  }
};
