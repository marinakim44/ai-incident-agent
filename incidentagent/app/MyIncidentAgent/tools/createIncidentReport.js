import fs from "fs";
import path from "path";
import { Document, Packer, Paragraph, HeadingLevel, TextRun } from "docx";

export async function createIncidentReport(reportText, investigationTimeline) {
  const timelineParagraphs = investigationTimeline.flatMap((entry) => [
    new Paragraph(`${entry.timestamp} | ${entry.action} | ${entry.status}`),
  ]);
  console.log("TIMELINE:", investigationTimeline);
  console.log("TIMELINE PARAGRAPHS:", timelineParagraphs.length);
  console.log("REPORT TEXT:", reportText);
  const doc = new Document({
    sections: [
      {
        children: [
          new Paragraph({
            text: "Incident Report",
            heading: HeadingLevel.TITLE,
          }),

          new Paragraph(""),

          new Paragraph({
            text: "Summary",
            heading: HeadingLevel.HEADING_1,
          }),

          ...reportText.split("\n").map(
            (line) =>
              new Paragraph({
                text: line,
              }),
          ),

          new Paragraph(""),

          new Paragraph({
            text: "Investigation Timeline",
            heading: HeadingLevel.HEADING_1,
          }),

          ...timelineParagraphs,

          new Paragraph(""),
        ],
      },
    ],
  });

  const buffer = await Packer.toBuffer(doc);
  const fileName = `incident_report_${Date.now()}.docx`;
  // const reportsDir = path.join("./reports");
  const reportsDir = "/tmp/reports";

  if (!fs.existsSync(reportsDir)) {
    fs.mkdirSync(reportsDir, { recursive: true });
  }

  const filePath = path.join(reportsDir, fileName);
  fs.writeFileSync(filePath, buffer);

  return {
    success: true,
    filePath,
    fileName,
  };
}
