export const APPS_SCRIPT_CODE = `/**
 * Google Apps Script: School Portfolio Backend
 * สำหรับระบบคลังผลงานและหลักฐานเชิงประจักษ์ โรงเรียนบ้านหนองหว้า
 * 
 * วิธีการติดตั้ง:
 * 1. สร้าง Google Sheet ใหม่ และเปิดส่วน "ส่วนขยาย" -> "Apps Script"
 * 2. คัดลอกโค้ดนี้ทั้งหมดไปวางในไฟล์ Code.gs ของ Apps Script
 * 3. บันทึกและคลิกที่ปุ่ม "ทำให้ใช้งานได้" (Deploy) -> "การจัดการทำให้ใช้งานได้ใหม่" (New deployment)
 * 4. เลือกประเภทเป็น "เว็บแอป" (Web app)
 * 5. ตั้งค่า:
 *    - เรียกใช้ในฐานะ: "ฉัน" (Execute as: Me - อีเมลของคุณ)
 *    - ผู้มีสิทธิ์เข้าถึง: "ทุกคน" (Who has access: Anyone)
 * 6. คลิก "ทำให้ใช้งานได้" และคัดลอก "URL ของเว็บแอป" (Web App URL) มาใส่ในหน้าระบบการตั้งค่าเชื่อมต่อ
 */

const SHEET_NAME = "Portfolios";

// ตรวจสอบและสร้างโฟลเดอร์ใน Google Drive และชีตที่จำเป็น
function setupDatabase() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  let sheet = ss.getSheetByName(SHEET_NAME);
  
  if (!sheet) {
    sheet = ss.insertSheet(SHEET_NAME);
    // สร้างหัวตาราง (Headers)
    const headers = [
      "ID", "Category", "Type", "Title", "Description", 
      "Academic Year", "Award Date", "Giver", "Reward Level", 
      "Owner Name", "Position", "Department", "Student Class", 
      "Responsible Person", "Attachments", "Approved", "Created At"
    ];
    sheet.appendRow(headers);
    sheet.getRange(1, 1, 1, headers.length).setFontWeight("bold").setBackground("#1E40AF").setFontColor("#FFFFFF");
  }
  
  // ตรวจสอบและสร้างโฟลเดอร์หลักใน Google Drive
  let rootFolder;
  const folders = DriveApp.getFoldersByName("School Portfolio");
  if (folders.hasNext()) {
    rootFolder = folders.next();
  } else {
    rootFolder = DriveApp.createFolder("School Portfolio");
    rootFolder.createFolder("ผลงานโรงเรียน");
    rootFolder.createFolder("ผลงานครู");
    rootFolder.createFolder("ผลงานนักเรียน");
  }
  
  return {
    sheetId: ss.getId(),
    rootFolderId: rootFolder.getId()
  };
}

// ฟังก์ชันดึงโฟลเดอร์ปลายทางตามหมวดหมู่ผลงาน
function getSubFolder(category) {
  let rootFolder;
  const folders = DriveApp.getFoldersByName("School Portfolio");
  if (folders.hasNext()) {
    rootFolder = folders.next();
  } else {
    rootFolder = DriveApp.createFolder("School Portfolio");
  }
  
  let folderName = "ผลงานโรงเรียน";
  if (category === "teacher") {
    folderName = "ผลงานครู";
  } else if (category === "student") {
    folderName = "ผลงานนักเรียน";
  }
  
  const subFolders = rootFolder.getFoldersByName(folderName);
  if (subFolders.hasNext()) {
    return subFolders.next();
  } else {
    return rootFolder.createFolder(folderName);
  }
}

// จัดการ CORS และ GET Requests
function doGet(e) {
  setupDatabase(); // เริ่มต้นระบบตารางและโฟลเดอร์หากยังไม่มี
  
  const action = e.parameter.action;
  let result;
  
  try {
    if (action === "getItems") {
      result = getPortfolios();
    } else {
      result = { status: "error", message: "ไม่พบ Action ที่ระบุ" };
    }
  } catch (err) {
    result = { status: "error", message: err.toString() };
  }
  
  return ContentService.createTextOutput(JSON.stringify(result))
    .setMimeType(ContentService.MimeType.JSON);
}

// จัดการ POST Requests
function doPost(e) {
  let result;
  try {
    const postData = JSON.parse(e.postData.contents);
    const action = postData.action;
    
    if (action === "addItem") {
      result = addPortfolio(postData.data);
    } else if (action === "updateItem") {
      result = updatePortfolio(postData.id, postData.data);
    } else if (action === "deleteItem") {
      result = deletePortfolio(postData.id);
    } else if (action === "approveItem") {
      result = approvePortfolio(postData.id, postData.approved);
    } else if (action === "uploadFile") {
      result = uploadFileToDrive(postData.category, postData.fileData);
    } else {
      result = { status: "error", message: "ไม่พบ Action ที่ระบุ" };
    }
  } catch (err) {
    result = { status: "error", message: err.toString() };
  }
  
  return ContentService.createTextOutput(JSON.stringify(result))
    .setMimeType(ContentService.MimeType.JSON);
}

// ฟังก์ชันอ่านข้อมูลทั้งหมด
function getPortfolios() {
  const sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(SHEET_NAME);
  const rows = sheet.getDataRange().getValues();
  const headers = rows[0];
  const items = [];
  
  for (let i = 1; i < rows.length; i++) {
    const row = rows[i];
    const item = {};
    for (let j = 0; j < headers.length; j++) {
      const key = headers[j];
      let val = row[j];
      
      // แปลงคีย์ของตารางให้ตรงกับ Frontend
      let keyFormatted = key.replace(/\\s+/g, "");
      if (keyFormatted === "ID") keyFormatted = "id";
      else if (keyFormatted === "Category") keyFormatted = "category";
      else if (keyFormatted === "Type") keyFormatted = "type";
      else if (keyFormatted === "Title") keyFormatted = "title";
      else if (keyFormatted === "Description") keyFormatted = "description";
      else if (keyFormatted === "AcademicYear") keyFormatted = "academicYear";
      else if (keyFormatted === "AwardDate") {
        keyFormatted = "awardDate";
        if (val instanceof Date) {
          val = Utilities.formatDate(val, Session.getScriptTimeZone(), "yyyy-MM-dd");
        }
      }
      else if (keyFormatted === "Giver") keyFormatted = "giver";
      else if (keyFormatted === "RewardLevel") keyFormatted = "rewardLevel";
      else if (keyFormatted === "OwnerName") keyFormatted = "ownerName";
      else if (keyFormatted === "Position") keyFormatted = "position";
      else if (keyFormatted === "Department") keyFormatted = "department";
      else if (keyFormatted === "StudentClass") keyFormatted = "studentClass";
      else if (keyFormatted === "ResponsiblePerson") keyFormatted = "responsiblePerson";
      else if (keyFormatted === "Attachments") {
        keyFormatted = "attachments";
        try {
          val = val ? JSON.parse(val) : [];
        } catch(e) {
          val = [];
        }
      }
      else if (keyFormatted === "Approved") {
        keyFormatted = "approved";
        val = val === true || val === "TRUE";
      }
      else if (keyFormatted === "CreatedAt") {
        keyFormatted = "createdAt";
        if (val instanceof Date) {
          val = Utilities.formatDate(val, Session.getScriptTimeZone(), "yyyy-MM-dd'T'HH:mm:ssXXX");
        }
      }
      
      item[keyFormatted] = val;
    }
    items.push(item);
  }
  
  return { status: "success", data: items };
}

// ฟังก์ชันเพิ่มข้อมูลผลงาน
function addPortfolio(data) {
  const sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(SHEET_NAME);
  const id = Utilities.getUuid();
  const createdAt = Utilities.formatDate(new Date(), Session.getScriptTimeZone(), "yyyy-MM-dd'T'HH:mm:ssXXX");
  
  const rowData = [
    id,
    data.category,
    data.type,
    data.title,
    data.description,
    data.academicYear,
    data.awardDate,
    data.giver,
    data.rewardLevel,
    data.ownerName,
    data.position,
    data.department,
    data.studentClass,
    data.responsiblePerson,
    JSON.stringify(data.attachments || []),
    data.approved === true || data.approved === "true" ? true : false,
    createdAt
  ];
  
  sheet.appendRow(rowData);
  
  // แปลงข้อมูลที่เพิ่มสำเร็จส่งกลับให้ Frontend
  data.id = id;
  data.createdAt = createdAt;
  data.approved = data.approved === true || data.approved === "true";
  
  return { status: "success", data: data };
}

// ฟังก์ชันแก้ไขข้อมูลผลงาน
function updatePortfolio(id, data) {
  const sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(SHEET_NAME);
  const rows = sheet.getDataRange().getValues();
  
  for (let i = 1; i < rows.length; i++) {
    if (rows[i][0] === id) {
      const rowIndex = i + 1; // อาร์เรย์เริ่มต้นด้วย 0 แต่แถวเริ่มต้นด้วย 1
      
      sheet.getRange(rowIndex, 2).setValue(data.category);
      sheet.getRange(rowIndex, 3).setValue(data.type);
      sheet.getRange(rowIndex, 4).setValue(data.title);
      sheet.getRange(rowIndex, 5).setValue(data.description);
      sheet.getRange(rowIndex, 6).setValue(data.academicYear);
      sheet.getRange(rowIndex, 7).setValue(data.awardDate);
      sheet.getRange(rowIndex, 8).setValue(data.giver);
      sheet.getRange(rowIndex, 9).setValue(data.rewardLevel);
      sheet.getRange(rowIndex, 10).setValue(data.ownerName);
      sheet.getRange(rowIndex, 11).setValue(data.position);
      sheet.getRange(rowIndex, 12).setValue(data.department);
      sheet.getRange(rowIndex, 13).setValue(data.studentClass);
      sheet.getRange(rowIndex, 14).setValue(data.responsiblePerson);
      sheet.getRange(rowIndex, 15).setValue(JSON.stringify(data.attachments || []));
      // เก็บสถานะการอนุมัติเดิม หรือปรับตามที่ส่งมา
      if (data.approved !== undefined) {
        sheet.getRange(rowIndex, 16).setValue(data.approved === true || data.approved === "true" ? true : false);
      }
      
      return { status: "success", message: "แก้ไขข้อมูลสำเร็จ", id: id };
    }
  }
  
  return { status: "error", message: "ไม่พบรายการผลงานที่ต้องการแก้ไข" };
}

// ฟังก์ชันลบผลงาน
function deletePortfolio(id) {
  const sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(SHEET_NAME);
  const rows = sheet.getDataRange().getValues();
  
  for (let i = 1; i < rows.length; i++) {
    if (rows[i][0] === id) {
      const rowIndex = i + 1;
      
      // ดึงไฟล์แนบเพื่อไปลบใน Drive (ถ้ามี)
      try {
        const attachmentsJson = rows[i][14];
        if (attachmentsJson) {
          const attachments = JSON.parse(attachmentsJson);
          attachments.forEach(function(file) {
            if (file.id) {
              try {
                const driveFile = DriveApp.getFileById(file.id);
                driveFile.setTrashed(true); // ย้ายลงถังขยะใน Drive
              } catch (e) {
                // ข้ามหากไม่มีสิทธิ์หรือไฟล์ถูกลบไปแล้ว
              }
            }
          });
        }
      } catch (e) {
        // ข้ามหากแปลงไฟล์แนบไม่ผ่าน
      }
      
      sheet.deleteRow(rowIndex);
      return { status: "success", message: "ลบข้อมูลเรียบร้อยแล้ว", id: id };
    }
  }
  
  return { status: "error", message: "ไม่พบรายการผลงานที่ต้องการลบ" };
}

// ฟังก์ชันอนุมัติผลงานโดยผู้ดูแลระบบ
function approvePortfolio(id, approved) {
  const sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(SHEET_NAME);
  const rows = sheet.getDataRange().getValues();
  
  for (let i = 1; i < rows.length; i++) {
    if (rows[i][0] === id) {
      const rowIndex = i + 1;
      sheet.getRange(rowIndex, 16).setValue(approved === true);
      return { status: "success", message: approved ? "อนุมัติผลงานสำเร็จ" : "ยกเลิกการอนุมัติสำเร็จ", id: id };
    }
  }
  
  return { status: "error", message: "ไม่พบรายการผลงาน" };
}

// ฟังก์ชันอัพโหลดไฟล์ไปยังโฟลเดอร์ใน Google Drive
function uploadFileToDrive(category, fileData) {
  try {
    const folder = getSubFolder(category);
    
    // แปลง Base64 กลับเป็นไฟล์ไบนารี
    const contentType = fileData.type;
    const base64Data = fileData.base64.split(",")[1] || fileData.base64;
    const decodedData = Utilities.base64Decode(base64Data);
    const blob = Utilities.newBlob(decodedData, contentType, fileData.name);
    
    // บันทึกไฟล์ในโฟลเดอร์ Google Drive
    const file = folder.createFile(blob);
    
    // ตั้งค่าให้ทุกคนที่มีลิงก์สามารถดูไฟล์ได้ (เพื่อให้ระบบแสดงรูปหรือโหลด PDF ได้ทันที)
    file.setSharing(DriveApp.Access.ANYONE_WITH_LINK, DriveApp.Permission.VIEW);
    
    return {
      status: "success",
      file: {
        id: file.getId(),
        name: file.getName(),
        type: contentType,
        url: file.getUrl() // ลิงก์ตรงจาก Drive
      }
    };
  } catch (err) {
    return { status: "error", message: "อัพโหลดไม่สำเร็จ: " + err.toString() };
  }
}
`;

export const SHEET_TEMPLATE_GUIDE = `
โครงสร้างคอลัมน์ของ Google Sheets ในชีตชื่อ "Portfolios":
┌──────────────────────┬─────────────┬─────────────┐
│ คอลัมน์ (Column)      │ ชนิดข้อมูล   │ คำอธิบาย    │
├──────────────────────┼─────────────┼─────────────┤
│ ID                   │ ข้อความ     │ รหัส UUID   │
│ Category             │ ข้อความ     │ school, teacher, student │
│ Type                 │ ข้อความ     │ ประเภทผลงาน │
│ Title                │ ข้อความ     │ ชื่อผลงาน    │
│ Description          │ ข้อความ     │ รายละเอียด   │
│ Academic Year        │ ตัวเลข      │ ปีการศึกษา   │
│ Award Date           │ วันที่       │ วันที่ได้รับ  │
│ Giver                │ ข้อความ     │ หน่วยงานผู้มอบ│
│ Reward Level         │ ข้อความ     │ ระดับรางวัล  │
│ Owner Name           │ ข้อความ     │ ชื่อเจ้าของ  │
│ Position             │ ข้อความ     │ ตำแหน่ง     │
│ Department           │ ข้อความ     │ กลุ่มสาระ    │
│ Student Class        │ ข้อความ     │ ชั้นเรียน     │
│ Responsible Person   │ ข้อความ     │ ผู้รับผิดชอบ  │
│ Attachments          │ JSON String │ รายการไฟล์  │
│ Approved             │ บูลีน       │ TRUE/FALSE  │
│ Created At           │ วันที่/เวลา  │ วันที่บันทึก │
└──────────────────────┴─────────────┴─────────────┘
`;
