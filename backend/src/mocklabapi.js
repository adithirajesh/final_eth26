import express from "express";

const app = express();

const tests = {
  "LAB-123": { result: "Negative" }
};

app.get("/lab/:id", (req, res) => {
  const data = tests[req.params.id];

  if (!data) return res.json({ exists: false });

  res.json({
    exists: true,
    result: data.result
  });
});

app.listen(3002, () => {
  console.log("✅ Server running at http://localhost:3002");
});
