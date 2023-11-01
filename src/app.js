

import puppeteer from "puppeteer";
import express from "express";
import { MailService } from "@sendgrid/mail";
import nodemailer from "nodemailer";
import cron from "node-cron";
import sgMail from '@sendgrid/mail';






(async () => {
  const app = express();
  const port = 3000;

  // Define an HTML template for displaying the first project's text content
  const resultsTemplate = (projectText, projectDate) => `
    <!DOCTYPE html>
    <html>
    <head>
      <title>New Project</title>
    </head>
    <body>
    <h1>Project Details</h1>
    <p><strong>Project Date:</strong> ${projectDate}</p>
    <p><strong>Project Text:</strong> ${projectText}</p>
    </body>
    </html>
  `;

  let firstProjectText = "";

  async function getFirstProjectText(page) {
    const textContent = await page.evaluate(() => {
      const projectLink = document.querySelector('a[href*="quoi=voir_projet"]');
      return projectLink ? projectLink.textContent : null;
    });
    return textContent;
  }

  const browser = await puppeteer.launch({ headless: "new" });
    const page = await browser.newPage();
  await page.goto('https://www.progonline.com/'); // Replace with the actual website URL

  // ... Your existing scraping code ...

  await page.waitForSelector('li.featured a[href="visitor_mypage.php?quoi=deconnexion"]');
  await page.click('li.featured a[href="visitor_mypage.php?quoi=deconnexion"]');

  await new Promise(resolve => setTimeout(resolve, 6000));
  await page.type('input[name="nick"]', 'contact.doublegeste'); // Replace with your username
  await page.type('input[name="password"]', 'jJRlhVrLGp8jzL7'); // Replace with your password

  await page.click('#form_submit'); // Submit the login form

  // Wait for the page to load and the "Projets disponibles" link to be available
  await page.waitForSelector('li a[href="mypage.php?quoi=my_demandes"]');

  // Use page.evaluate to find and click the link by its text content
  await page.evaluate(() => {
    const projetsDisponiblesLink = Array.from(document.querySelectorAll('li a')).find(a => a.textContent.includes("Projets disponibles"));
    if (projetsDisponiblesLink) {
      projetsDisponiblesLink.click();
    } else {
      console.error('Projets disponibles link not found');
    }
  });

  // Wait for the page to load
  await page.waitForSelector('a[href*="quoi=voir_projet"]');

  // Get the first project's text content
  firstProjectText = await getFirstProjectText(page);

  // Display the text content of the first project link in the console
  if (firstProjectText) {
    console.log('Text content of the first project link:');
    console.log(firstProjectText);
  } else {
    console.error('First project link not found');
  }

  const projectDetails = await page.evaluate(() => {
    const projectLink = document.querySelector('a[href*="quoi=voir_projet"]');
    let projectDate = null;

    if (projectLink) {
      const projectText = projectLink.textContent;
      const dateMatch = projectText.match(/Publié le\s*:\s*(\d{1,2}\/\d{1,2}\/\d{4})/);
      if (dateMatch) {
        projectDate = dateMatch[1];
      }
      return { projectText, projectDate };
    } else {
      return { projectText: null, projectDate: null };
    }
  });


  // Set your SendGrid API key
  
   // Initialize SendGrid
   sgMail.setApiKey('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');

   // Function to send an email notification
   function sendNotification(emailAddress, projectDate, projectText) {
     const msg = {
       to: emailAddress,
       from: 'sender@doublegeste.com', // Replace with your sender email address
       subject: 'Project Reminder',
       text: `Project Date: ${projectDate}\nProject Text: ${projectText}`,
     };
 
     sgMail.send(msg)
       .then(() => {
         console.log('Email notification sent');
       })
       .catch((error) => {
         console.error('Email notification error:', error);
       });
   }


   // Function to perform the project check
  async function checkProject() {
    // Your project checking logic here
    const today = new Date();
    const { projectText, projectDate } = projectDetails;

    if (projectDate) {
      const projectDateObj = new Date(projectDate);
      if (today.toDateString() === projectDateObj.toDateString()) {
        sendNotification('arthur.boval@gmail.com', projectDate, projectText);
      }
    }
  }

  // Schedule the check every two hours
  cron.schedule('0 */2 * * *', () => {
    console.log('Running project check...');
    checkProject();
  });
  // });
  
  // Directly call the sendNotification function with test data
  // sendNotification('arthur.boval@gmail.com', projectDate, projectText);
//   });

  await browser.close();

  app.get("/", async (req, res) => {
    try {
      const { projectText, projectDate } = projectDetails;
      // Render the project details as HTML
      res.send(resultsTemplate(projectText, projectDate));
    } catch (error) {
      res.status(500).send("An error occurred: " + error.message);
    }
  });

  app.listen(port, () => {
    console.log(`Server is running on http://localhost:${port}`);
  });
})();
