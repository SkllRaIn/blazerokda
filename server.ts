import dotenv from "dotenv";
dotenv.config();
/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import express, { Request, Response, NextFunction } from 'express';
import path from 'path';
import fs from 'fs';
import crypto from 'crypto';
import { createServer as createViteServer } from 'vite';
import { DatabaseState, AppConfig, Branch, Service, Booking, Promotion, Review, AdminUser, Customer } from './src/types';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
import nodemailer from 'nodemailer';
import lockfile from 'proper-lockfile';
import mysql from 'mysql2/promise';

const app = express();
const PORT = 3000;
const DB_FILE = path.join(process.cwd(), 'data', 'db.json');

// Ensure JWT_SECRET is configured
if (!process.env.JWT_SECRET) {
  console.error('FATAL: JWT_SECRET не задан в .env');
  process.exit(1);
}
const JWT_SECRET = process.env.JWT_SECRET;

// Ensure YUKASSA_SECRET_KEY is configured
if (!process.env.YUKASSA_SECRET_KEY) {
  console.error('FATAL: YUKASSA_SECRET_KEY не задан в .env');
  process.exit(1);
}

// MariaDB Database variables
let dbPool: mysql.Pool | null = null;
let useMariaDB = false;
let dbInMemory: DatabaseState = getDBStateFromFile();

// Read-write Fallback JSON utils
function getDBStateFromFile(): DatabaseState {
  try {
    if (fs.existsSync(DB_FILE)) {
      const data = fs.readFileSync(DB_FILE, 'utf-8');
      const parsed = JSON.parse(data);
      if (!parsed.customers) parsed.customers = [];
      return parsed;
    }
  } catch (err) {
    console.error('Error reading DB JSON fallback, using static state', err);
  }
  return {
    config: {
      companyName: 'АС-Авто',
      primaryColor: '#2563eb',
      accentColor: '#f97316',
      bgColor: '#ffffff',
      phone: '+7 (817) 200-00-00',
      email: 'info@as-auto.ru',
      workHours: 'Пн-Вс: 09:00 - 20:00',
      billingProvider: 'none',
      billingKeys: {},
      isAdminCreated: false,
      isInstalled: false
    },
    branches: [],
    services: [],
    bookings: [],
    promotions: [],
    reviews: [],
    admins: [],
    customers: []
  };
}

async function createMariaTables() {
  if (!dbPool) return;
  // 1. Config
  await dbPool.query(`
    CREATE TABLE IF NOT EXISTS ac_config (
      id INT PRIMARY KEY DEFAULT 1,
      companyName VARCHAR(255) NOT NULL,
      logoUrl TEXT NULL,
      primaryColor VARCHAR(50) NOT NULL,
      accentColor VARCHAR(50) NOT NULL,
      bgColor VARCHAR(50) NOT NULL,
      phone VARCHAR(100) NOT NULL,
      email VARCHAR(100) NOT NULL,
      workHours VARCHAR(100) NOT NULL,
      billingProvider VARCHAR(50) NOT NULL,
      billingKeys TEXT NULL,
      smtpHost VARCHAR(255) NULL,
      smtpPort INT NULL,
      smtpUser VARCHAR(255) NULL,
      smtpPass VARCHAR(255) NULL,
      smsProvider VARCHAR(50) NULL,
      smsLogin VARCHAR(255) NULL,
      smsPassword VARCHAR(255) NULL,
      isAdminCreated TINYINT(1) DEFAULT 0,
      isInstalled TINYINT(1) DEFAULT 0
    )
  `);

  // 2. Branches
  await dbPool.query(`
    CREATE TABLE IF NOT EXISTS ac_branches (
      id VARCHAR(100) PRIMARY KEY,
      name VARCHAR(255) NOT NULL,
      address TEXT NOT NULL,
      phone VARCHAR(100) NOT NULL,
      email VARCHAR(100) NOT NULL,
      hours VARCHAR(100) NOT NULL,
      lat DOUBLE NOT NULL,
      lng DOUBLE NOT NULL,
      isActive TINYINT(1) DEFAULT 1
    )
  `);

  // 3. Services
  await dbPool.query(`
    CREATE TABLE IF NOT EXISTS ac_services (
      id VARCHAR(100) PRIMARY KEY,
      category VARCHAR(255) NOT NULL,
      name VARCHAR(255) NOT NULL,
      price INT NOT NULL,
      oldPrice INT NULL,
      duration INT NOT NULL,
      description TEXT NOT NULL,
      icon VARCHAR(100) NOT NULL,
      isActive TINYINT(1) DEFAULT 1,
      sortOrder INT DEFAULT 0
    )
  `);

  // 4. Bookings
  await dbPool.query(`
    CREATE TABLE IF NOT EXISTS ac_bookings (
      id VARCHAR(100) PRIMARY KEY,
      branchId VARCHAR(100) NOT NULL,
      serviceId VARCHAR(100) NOT NULL,
      date VARCHAR(50) NOT NULL,
      time VARCHAR(50) NOT NULL,
      carMake VARCHAR(255) NOT NULL,
      carModel VARCHAR(255) NOT NULL,
      carYear VARCHAR(50) NOT NULL,
      carVin VARCHAR(100) NULL,
      clientName VARCHAR(255) NOT NULL,
      clientPhone VARCHAR(100) NOT NULL,
      clientEmail VARCHAR(255) NOT NULL,
      prepaymentOption VARCHAR(50) NOT NULL,
      status VARCHAR(50) NOT NULL,
      amount INT NOT NULL,
      prepaidAmount INT NOT NULL,
      paymentStatus VARCHAR(50) NOT NULL,
      paymentId VARCHAR(100) NULL,
      notes TEXT NULL,
      createdAt VARCHAR(100) NOT NULL
    )
  `);

  // 5. Promotions
  await dbPool.query(`
    CREATE TABLE IF NOT EXISTS ac_promotions (
      id VARCHAR(100) PRIMARY KEY,
      title VARCHAR(255) NOT NULL,
      description TEXT NOT NULL,
      discountType VARCHAR(50) NOT NULL,
      discountValue INT NOT NULL,
      promoCode VARCHAR(100) NULL,
      expiryDateStr VARCHAR(100) NULL,
      isActive TINYINT(1) DEFAULT 1
    )
  `);

  // 6. Reviews
  await dbPool.query(`
    CREATE TABLE IF NOT EXISTS ac_reviews (
      id VARCHAR(100) PRIMARY KEY,
      clientName VARCHAR(255) NOT NULL,
      rating INT NOT NULL,
      text TEXT NOT NULL,
      date VARCHAR(100) NOT NULL,
      isApproved TINYINT(1) DEFAULT 0,
      replyText TEXT NULL
    )
  `);

  // 7. Admins
  await dbPool.query(`
    CREATE TABLE IF NOT EXISTS ac_admins (
      username VARCHAR(100) PRIMARY KEY,
      email VARCHAR(255) NOT NULL,
      passwordHash VARCHAR(255) NOT NULL,
      role VARCHAR(50) NOT NULL
    )
  `);

  // 8. Customers
  await dbPool.query(`
    CREATE TABLE IF NOT EXISTS ac_customers (
      id VARCHAR(100) PRIMARY KEY,
      email VARCHAR(255) UNIQUE NOT NULL,
      passwordHash VARCHAR(255) NOT NULL,
      fullName VARCHAR(255) NOT NULL,
      phone VARCHAR(100) NOT NULL,
      createdAt VARCHAR(100) NOT NULL
    )
  `);
}

async function loadDataFromMariaDB() {
  if (!dbPool) return;

  // 1. Config
  const [configs]: any = await dbPool.query('SELECT * FROM ac_config WHERE id = 1');
  if (configs.length > 0) {
    const rawConf = configs[0];
    dbInMemory.config = {
      companyName: rawConf.companyName,
      logoUrl: rawConf.logoUrl || undefined,
      primaryColor: rawConf.primaryColor,
      accentColor: rawConf.accentColor,
      bgColor: rawConf.bgColor,
      phone: rawConf.phone,
      email: rawConf.email,
      workHours: rawConf.workHours,
      billingProvider: rawConf.billingProvider,
      billingKeys: rawConf.billingKeys ? JSON.parse(rawConf.billingKeys) : {},
      smtpHost: rawConf.smtpHost || undefined,
      smtpPort: rawConf.smtpPort || undefined,
      smtpUser: rawConf.smtpUser || undefined,
      smtpPass: rawConf.smtpPass || undefined,
      smsProvider: rawConf.smsProvider || undefined,
      smsLogin: rawConf.smsLogin || undefined,
      smsPassword: rawConf.smsPassword || undefined,
      isAdminCreated: !!rawConf.isAdminCreated,
      isInstalled: !!rawConf.isInstalled
    };
  } else {
    // Write local configuration to MariaDB initially
    const conf = dbInMemory.config;
    await dbPool.query(`
      INSERT INTO ac_config (id, companyName, logoUrl, primaryColor, accentColor, bgColor, phone, email, workHours, billingProvider, billingKeys, smtpHost, smtpPort, smtpUser, smtpPass, smsProvider, smsLogin, smsPassword, isAdminCreated, isInstalled)
      VALUES (1, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `, [
      conf.companyName, conf.logoUrl || null, conf.primaryColor, conf.accentColor, conf.bgColor,
      conf.phone, conf.email, conf.workHours, conf.billingProvider, JSON.stringify(conf.billingKeys || {}),
      conf.smtpHost || null, conf.smtpPort || null, conf.smtpUser || null, conf.smtpPass || null,
      conf.smsProvider || null, conf.smsLogin || null, conf.smsPassword || null,
      conf.isAdminCreated ? 1 : 0, conf.isInstalled ? 1 : 0
    ]);
  }

  // Helper macro to sync database tables if SQL tables are completely empty, migrating file state
  // 2. Branches
  const [branchesRows]: any = await dbPool.query('SELECT * FROM ac_branches');
  if (branchesRows.length > 0) {
    dbInMemory.branches = branchesRows.map((b: any) => ({
      id: b.id,
      name: b.name,
      address: b.address,
      phone: b.phone,
      email: b.email,
      hours: b.hours,
      lat: b.lat,
      lng: b.lng,
      isActive: !!b.isActive
    }));
  } else if (dbInMemory.branches.length > 0) {
    for (const b of dbInMemory.branches) {
      await dbPool.query('INSERT INTO ac_branches (id, name, address, phone, email, hours, lat, lng, isActive) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)',
        [b.id, b.name, b.address, b.phone, b.email, b.hours, b.lat, b.lng, b.isActive ? 1 : 0]
      );
    }
  }

  // 3. Services
  const [servicesRows]: any = await dbPool.query('SELECT * FROM ac_services');
  if (servicesRows.length > 0) {
    dbInMemory.services = servicesRows.map((s: any) => ({
      id: s.id,
      category: s.category,
      name: s.name,
      price: s.price,
      oldPrice: s.oldPrice || undefined,
      duration: s.duration,
      description: s.description,
      icon: s.icon,
      isActive: !!s.isActive,
      sortOrder: s.sortOrder
    }));
  } else if (dbInMemory.services.length > 0) {
    for (const s of dbInMemory.services) {
      await dbPool.query('INSERT INTO ac_services (id, category, name, price, oldPrice, duration, description, icon, isActive, sortOrder) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)',
        [s.id, s.category, s.name, s.price, s.oldPrice || null, s.duration, s.description, s.icon, s.isActive ? 1 : 0, s.sortOrder]
      );
    }
  }

  // 5. Promotions
  const [promotionsRows]: any = await dbPool.query('SELECT * FROM ac_promotions');
  if (promotionsRows.length > 0) {
    dbInMemory.promotions = promotionsRows.map((p: any) => ({
      id: p.id,
      title: p.title,
      description: p.description,
      discountType: p.discountType as any,
      discountValue: p.discountValue,
      promoCode: p.promoCode || undefined,
      expiryDateStr: p.expiryDateStr || undefined,
      isActive: !!p.isActive
    }));
  } else if (dbInMemory.promotions.length > 0) {
    for (const p of dbInMemory.promotions) {
      await dbPool.query('INSERT INTO ac_promotions (id, title, description, discountType, discountValue, promoCode, expiryDateStr, isActive) VALUES (?, ?, ?, ?, ?, ?, ?, ?)',
        [p.id, p.title, p.description, p.discountType, p.discountValue, p.promoCode || null, p.expiryDateStr || null, p.isActive ? 1 : 0]
      );
    }
  }

  // 6. Reviews
  const [reviewsRows]: any = await dbPool.query('SELECT * FROM ac_reviews');
  if (reviewsRows.length > 0) {
    dbInMemory.reviews = reviewsRows.map((r: any) => ({
      id: r.id,
      clientName: r.clientName,
      rating: r.rating,
      text: r.text,
      date: r.date,
      isApproved: !!r.isApproved,
      replyText: r.replyText || undefined
    }));
  } else if (dbInMemory.reviews.length > 0) {
    for (const r of dbInMemory.reviews) {
      await dbPool.query('INSERT INTO ac_reviews (id, clientName, rating, text, date, isApproved, replyText) VALUES (?, ?, ?, ?, ?, ?, ?)',
        [r.id, r.clientName, r.rating, r.text, r.date, r.isApproved ? 1 : 0, r.replyText || null]
      );
    }
  }

  // 7. Admins
  const [adminsRows]: any = await dbPool.query('SELECT * FROM ac_admins');
  if (adminsRows.length > 0) {
    dbInMemory.admins = adminsRows.map((a: any) => ({
      username: a.username,
      email: a.email,
      passwordHash: a.passwordHash,
      role: a.role as any
    }));
  } else if (dbInMemory.admins.length > 0) {
    for (const a of dbInMemory.admins) {
      await dbPool.query('INSERT INTO ac_admins (username, email, passwordHash, role) VALUES (?, ?, ?, ?)',
        [a.username, a.email, a.passwordHash, a.role]
      );
    }
  }

  // 8. Customers
  const [customersRows]: any = await dbPool.query('SELECT * FROM ac_customers');
  if (customersRows.length > 0) {
    dbInMemory.customers = customersRows.map((c: any) => ({
      id: c.id,
      email: c.email,
      passwordHash: c.passwordHash,
      fullName: c.fullName,
      phone: c.phone,
      createdAt: c.createdAt
    }));
  } else if (dbInMemory.customers && dbInMemory.customers.length > 0) {
    for (const c of dbInMemory.customers) {
      await dbPool.query('INSERT INTO ac_customers (id, email, passwordHash, fullName, phone, createdAt) VALUES (?, ?, ?, ?, ?, ?)',
        [c.id, c.email, c.passwordHash, c.fullName, c.phone, c.createdAt]
      );
    }
  }

  // 4. Bookings
  const [bookingsRows]: any = await dbPool.query('SELECT * FROM ac_bookings');
  if (bookingsRows.length > 0) {
    dbInMemory.bookings = bookingsRows.map((bk: any) => ({
      id: bk.id,
      branchId: bk.branchId,
      serviceId: bk.serviceId,
      date: bk.date,
      time: bk.time,
      carMake: bk.carMake,
      carModel: bk.carModel,
      carYear: bk.carYear,
      carVin: bk.carVin || undefined,
      clientName: bk.clientName,
      clientPhone: bk.clientPhone,
      clientEmail: bk.clientEmail,
      prepaymentOption: bk.prepaymentOption as any,
      status: bk.status as any,
      amount: bk.amount,
      prepaidAmount: bk.prepaidAmount,
      paymentStatus: bk.paymentStatus as any,
      paymentId: bk.paymentId || undefined,
      notes: bk.notes || undefined,
      createdAt: bk.createdAt
    }));
  } else if (dbInMemory.bookings.length > 0) {
    for (const bk of dbInMemory.bookings) {
      await dbPool.query('INSERT INTO ac_bookings (id, branchId, serviceId, date, time, carMake, carModel, carYear, carVin, clientName, clientPhone, clientEmail, prepaymentOption, status, amount, prepaidAmount, paymentStatus, paymentId, notes, createdAt) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)',
        [bk.id, bk.branchId, bk.serviceId, bk.date, bk.time, bk.carMake, bk.carModel, bk.carYear, bk.carVin || null, bk.clientName, bk.clientPhone, bk.clientEmail, bk.prepaymentOption, bk.status, bk.amount, bk.prepaidAmount, bk.paymentStatus, bk.paymentId || null, bk.notes || null, bk.createdAt]
      );
    }
  }
}

async function saveStateToMariaDB(state: DatabaseState) {
  if (!dbPool || !useMariaDB) return;
  try {
    // 1. Config
    const conf = state.config;
    await dbPool.query(`
      INSERT INTO ac_config (id, companyName, logoUrl, primaryColor, accentColor, bgColor, phone, email, workHours, billingProvider, billingKeys, smtpHost, smtpPort, smtpUser, smtpPass, smsProvider, smsLogin, smsPassword, isAdminCreated, isInstalled)
      VALUES (1, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      ON DUPLICATE KEY UPDATE
        companyName = VALUES(companyName),
        logoUrl = VALUES(logoUrl),
        primaryColor = VALUES(primaryColor),
        accentColor = VALUES(accentColor),
        bgColor = VALUES(bgColor),
        phone = VALUES(phone),
        email = VALUES(email),
        workHours = VALUES(workHours),
        billingProvider = VALUES(billingProvider),
        billingKeys = VALUES(billingKeys),
        smtpHost = VALUES(smtpHost),
        smtpPort = VALUES(smtpPort),
        smtpUser = VALUES(smtpUser),
        smtpPass = VALUES(smtpPass),
        smsProvider = VALUES(smsProvider),
        smsLogin = VALUES(smsLogin),
        smsPassword = VALUES(smsPassword),
        isAdminCreated = VALUES(isAdminCreated),
        isInstalled = VALUES(isInstalled)
    `, [
      conf.companyName, conf.logoUrl || null, conf.primaryColor, conf.accentColor, conf.bgColor,
      conf.phone, conf.email, conf.workHours, conf.billingProvider, JSON.stringify(conf.billingKeys || {}),
      conf.smtpHost || null, conf.smtpPort || null, conf.smtpUser || null, conf.smtpPass || null,
      conf.smsProvider || null, conf.smsLogin || null, conf.smsPassword || null,
      conf.isAdminCreated ? 1 : 0, conf.isInstalled ? 1 : 0
    ]);

    // 2. Branches
    if (state.branches.length > 0) {
      for (const b of state.branches) {
        await dbPool.query(`
          INSERT INTO ac_branches (id, name, address, phone, email, hours, lat, lng, isActive)
          VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
          ON DUPLICATE KEY UPDATE
            name = VALUES(name),
            address = VALUES(address),
            phone = VALUES(phone),
            email = VALUES(email),
            hours = VALUES(hours),
            lat = VALUES(lat),
            lng = VALUES(lng),
            isActive = VALUES(isActive)
        `, [b.id, b.name, b.address, b.phone, b.email, b.hours, b.lat, b.lng, b.isActive ? 1 : 0]);
      }
      const branchIds = state.branches.map(b => b.id);
      await dbPool.query('DELETE FROM ac_branches WHERE id NOT IN (?)', [branchIds]);
    } else {
      await dbPool.query('DELETE FROM ac_branches');
    }

    // 3. Services
    if (state.services.length > 0) {
      for (const s of state.services) {
        await dbPool.query(`
          INSERT INTO ac_services (id, category, name, price, oldPrice, duration, description, icon, isActive, sortOrder)
          VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
          ON DUPLICATE KEY UPDATE
            category = VALUES(category),
            name = VALUES(name),
            price = VALUES(price),
            oldPrice = VALUES(oldPrice),
            duration = VALUES(duration),
            description = VALUES(description),
            icon = VALUES(icon),
            isActive = VALUES(isActive),
            sortOrder = VALUES(sortOrder)
        `, [s.id, s.category, s.name, s.price, s.oldPrice || null, s.duration, s.description, s.icon, s.isActive ? 1 : 0, s.sortOrder]);
      }
      const srvIds = state.services.map(s => s.id);
      await dbPool.query('DELETE FROM ac_services WHERE id NOT IN (?)', [srvIds]);
    } else {
      await dbPool.query('DELETE FROM ac_services');
    }

    // 4. Bookings
    if (state.bookings.length > 0) {
      for (const bk of state.bookings) {
        await dbPool.query(`
          INSERT INTO ac_bookings (id, branchId, serviceId, date, time, carMake, carModel, carYear, carVin, clientName, clientPhone, clientEmail, prepaymentOption, status, amount, prepaidAmount, paymentStatus, paymentId, notes, createdAt)
          VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
          ON DUPLICATE KEY UPDATE
            branchId = VALUES(branchId),
            serviceId = VALUES(serviceId),
            date = VALUES(date),
            time = VALUES(time),
            carMake = VALUES(carMake),
            carModel = VALUES(carModel),
            carYear = VALUES(carYear),
            carVin = VALUES(carVin),
            clientName = VALUES(clientName),
            clientPhone = VALUES(clientPhone),
            clientEmail = VALUES(clientEmail),
            prepaymentOption = VALUES(prepaymentOption),
            status = VALUES(status),
            amount = VALUES(amount),
            prepaidAmount = VALUES(prepaidAmount),
            paymentStatus = VALUES(paymentStatus),
            paymentId = VALUES(paymentId),
            notes = VALUES(notes),
            createdAt = VALUES(createdAt)
        `, [
          bk.id, bk.branchId, bk.serviceId, bk.date, bk.time, bk.carMake, bk.carModel, bk.carYear, bk.carVin || null,
          bk.clientName, bk.clientPhone, bk.clientEmail, bk.prepaymentOption, bk.status, bk.amount, bk.prepaidAmount,
          bk.paymentStatus, bk.paymentId || null, bk.notes || null, bk.createdAt
        ]);
      }
      const bIds = state.bookings.map(b => b.id);
      await dbPool.query('DELETE FROM ac_bookings WHERE id NOT IN (?)', [bIds]);
    } else {
      await dbPool.query('DELETE FROM ac_bookings');
    }

    // 5. Promotions
    if (state.promotions.length > 0) {
      for (const p of state.promotions) {
        await dbPool.query(`
          INSERT INTO ac_promotions (id, title, description, discountType, discountValue, promoCode, expiryDateStr, isActive)
          VALUES (?, ?, ?, ?, ?, ?, ?, ?)
          ON DUPLICATE KEY UPDATE
            title = VALUES(title),
            description = VALUES(description),
            discountType = VALUES(discountType),
            discountValue = VALUES(discountValue),
            promoCode = VALUES(promoCode),
            expiryDateStr = VALUES(expiryDateStr),
            isActive = VALUES(isActive)
        `, [p.id, p.title, p.description, p.discountType, p.discountValue, p.promoCode || null, p.expiryDateStr || null, p.isActive ? 1 : 0]);
      }
      const pIds = state.promotions.map(p => p.id);
      await dbPool.query('DELETE FROM ac_promotions WHERE id NOT IN (?)', [pIds]);
    } else {
      await dbPool.query('DELETE FROM ac_promotions');
    }

    // 6. Reviews
    if (state.reviews.length > 0) {
      for (const r of state.reviews) {
        await dbPool.query(`
          INSERT INTO ac_reviews (id, clientName, rating, text, date, isApproved, replyText)
          VALUES (?, ?, ?, ?, ?, ?, ?)
          ON DUPLICATE KEY UPDATE
            clientName = VALUES(clientName),
            rating = VALUES(rating),
            text = VALUES(text),
            date = VALUES(date),
            isApproved = VALUES(isApproved),
            replyText = VALUES(replyText)
        `, [r.id, r.clientName, r.rating, r.text, r.date, r.isApproved ? 1 : 0, r.replyText || null]);
      }
      const rIds = state.reviews.map(r => r.id);
      await dbPool.query('DELETE FROM ac_reviews WHERE id NOT IN (?)', [rIds]);
    } else {
      await dbPool.query('DELETE FROM ac_reviews');
    }

    // 7. Admins
    if (state.admins.length > 0) {
      for (const a of state.admins) {
        await dbPool.query(`
          INSERT INTO ac_admins (username, email, passwordHash, role)
          VALUES (?, ?, ?, ?)
          ON DUPLICATE KEY UPDATE
            email = VALUES(email),
            passwordHash = VALUES(passwordHash),
            role = VALUES(role)
        `, [a.username, a.email, a.passwordHash, a.role]);
      }
      const usernames = state.admins.map(a => a.username);
      await dbPool.query('DELETE FROM ac_admins WHERE username NOT IN (?)', [usernames]);
    } else {
      await dbPool.query('DELETE FROM ac_admins');
    }

    // 8. Customers
    if (state.customers && state.customers.length > 0) {
      for (const c of state.customers) {
        await dbPool.query(`
          INSERT INTO ac_customers (id, email, passwordHash, fullName, phone, createdAt)
          VALUES (?, ?, ?, ?, ?, ?)
          ON DUPLICATE KEY UPDATE
            email = VALUES(email),
            passwordHash = VALUES(passwordHash),
            fullName = VALUES(fullName),
            phone = VALUES(phone)
        `, [c.id, c.email, c.passwordHash, c.fullName, c.phone, c.createdAt]);
      }
      const cIds = state.customers.map(c => c.id);
      await dbPool.query('DELETE FROM ac_customers WHERE id NOT IN (?)', [cIds]);
    } else {
      await dbPool.query('DELETE FROM ac_customers');
    }
  } catch (err) {
    console.error('[Database ERROR] saveStateToMariaDB failed', err);
  }
}

async function initMariaDB() {
  const host = process.env.DB_HOST;
  const port = Number(process.env.DB_PORT) || 3306;
  const user = process.env.DB_USER;
  const password = process.env.DB_PASSWORD;
  const database = process.env.DB_NAME || 'as_auto';

  if (!host) {
    console.log('[Database] DB_HOST не задан в .env. Используется режим локального JSON-файла.');
    return;
  }

  try {
    console.log(`[Database] Попытка подключения к MariaDB на ${host}:${port}...`);
    const adminConnection = await mysql.createConnection({
      host,
      port,
      user,
      password
    });

    await adminConnection.query(`CREATE DATABASE IF NOT EXISTS \`${database}\` CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci`);
    await adminConnection.end();

    dbPool = mysql.createPool({
      host,
      port,
      user,
      password,
      database,
      waitForConnections: true,
      connectionLimit: 10,
      queueLimit: 0
    });

    console.log(`[Database] Успешное подключение к MariaDB: "${database}"`);
    useMariaDB = true;

    await createMariaTables();
    await loadDataFromMariaDB();
    console.log('[Database] MariaDB успешно синхронизирована с ОЗУ.');
  } catch (err) {
    console.error('[Database ERROR] Не удалось подключиться к MariaDB. Откат к db.json.', err);
    useMariaDB = false;
  }
}

function getDBState(): DatabaseState {
  return dbInMemory;
}

async function writeDBState(state: DatabaseState) {
  try {
    dbInMemory = state;
    const dir = path.dirname(DB_FILE);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
    
    let release;
    try {
      if (fs.existsSync(DB_FILE)) {
        release = await lockfile.lock(DB_FILE, { retries: { retries: 5, minTimeout: 100 } });
      }
      fs.writeFileSync(DB_FILE, JSON.stringify(state, null, 2), 'utf-8');
    } catch (lockErr) {
      fs.writeFileSync(DB_FILE, JSON.stringify(state, null, 2), 'utf-8');
    } finally {
      if (release) {
        await release();
      }
    }

    if (useMariaDB) {
      await saveStateToMariaDB(state);
    }
  } catch (err) {
    console.error('Error writing DB elements safely', err);
  }
}

// Generate secure passwords
function hashPassword(password: string): string {
  return crypto.createHmac('sha256', JWT_SECRET).update(password).digest('hex');
}

// Custom JWT issuer & verifier (Native crypto implementation to prevent external dependencies errors)
function signToken(payload: object): string {
  const header = Buffer.from(JSON.stringify({ alg: 'HS256', typ: 'JWT' })).toString('base64url');
  const body = Buffer.from(JSON.stringify({ ...payload, exp: Math.floor(Date.now() / 1000) + 24 * 60 * 60 })).toString('base64url');
  const signature = crypto.createHmac('sha256', JWT_SECRET).update(`${header}.${body}`).digest('base64url');
  return `${header}.${body}.${signature}`;
}

function verifyToken(token: string): any {
  try {
    const parts = token.split('.');
    if (parts.length !== 3) return null;
    const [header, body, signature] = parts;
    const computedSig = crypto.createHmac('sha256', JWT_SECRET).update(`${header}.${body}`).digest('base64url');
    if (computedSig !== signature) return null;
    const decodedBody = JSON.parse(Buffer.from(body, 'base64url').toString('utf8'));
    if (decodedBody.exp < Math.floor(Date.now() / 1000)) return null; // Expired
    return decodedBody;
  } catch (_) {
    return null;
  }
}

// Middleware to authenticate Admins
interface AuthRequest extends Request {
  user?: { username: string; role: string };
}

function authMiddleware(req: AuthRequest, res: Response, next: NextFunction) {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Потребуется авторизация.' });
  }
  const token = authHeader.split(' ')[1];
  const payload = verifyToken(token);
  if (!payload) {
    return res.status(401).json({ error: 'Неверный или просроченный токен.' });
  }
  req.user = { username: payload.username, role: payload.role };
  next();
}

app.use(helmet({
  frameguard: false, // Don't block loading inside platform iFrames
  contentSecurityPolicy: false // Skip strict CSP to keep dynamic visualizers running
}));

app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes of lockout
  max: 10,
  message: { error: "Слишком много попыток. Попробуйте позже." },
  standardHeaders: true,
  legacyHeaders: false
});

// Notifications Delivery
async function sendEmail(to: string, subject: string, html: string) {
  const db = getDBState();
  const { smtpHost, smtpPort, smtpUser, smtpPass, companyName } = db.config;
  if (!smtpHost) {
    console.log(`[SMTP Simulated] To: ${to}, Subject: ${subject}. Host is empty, logged copy only.`);
    return;
  }
  try {
    const transporter = nodemailer.createTransport({
      host: smtpHost,
      port: Number(smtpPort) || 587,
      secure: Number(smtpPort) === 465,
      auth: {
        user: smtpUser,
        pass: smtpPass
      }
    });
    await transporter.sendMail({
      from: `"${companyName || 'АС-Авто'}" <${smtpUser}>`,
      to,
      subject,
      html
    });
    console.log(`[SMTP Success] Email sent actively to ${to}`);
  } catch (err) {
    console.error(`[SMTP Error] Failed sending to ${to}:`, err);
  }
}

async function sendSms(phone: string, text: string) {
  const db = getDBState();
  const { smsLogin, smsPassword } = db.config;
  if (!smsLogin) {
    console.log(`[SMS Simulated] To: ${phone}, Text: "${text}". Login is empty, logged copy only.`);
    return;
  }
  try {
    const url = new URL('https://smsc.ru/sys/send.php');
    url.searchParams.append('login', smsLogin);
    url.searchParams.append('psw', smsPassword || '');
    url.searchParams.append('phones', phone);
    url.searchParams.append('mes', text);
    url.searchParams.append('fmt', '3');

    const res = await fetch(url.toString());
    if (res.ok) {
      const textRes = await res.text();
      console.log(`[SMS Success] SMS requested safely. Response: ${textRes}`);
    } else {
      console.warn(`[SMS Warning] SMS gateway returned status ${res.status}`);
    }
  } catch (err) {
    console.error(`[SMS Error] Failed SMS to ${phone}:`, err);
  }
}

// =================== PUBLIC API ENDPOINTS ===================

// GET Config
app.get('/api/config', (req, res) => {
  const db = getDBState();
  res.json(db.config);
});

// GET Branches
app.get('/api/branches', (req, res) => {
  const db = getDBState();
  res.json(db.branches.filter(b => b.isActive));
});

// GET Services
app.get('/api/services', (req, res) => {
  const db = getDBState();
  const activeServices = db.services.filter(s => s.isActive);
  res.json(activeServices.sort((a, b) => a.sortOrder - b.sortOrder));
});

// GET Categories
app.get('/api/services/categories', (req, res) => {
  const db = getDBState();
  const categories = [...new Set(db.services.filter(s => s.isActive).map(s => s.category))];
  res.json(categories);
});

// GET Active promotions
app.get('/api/promotions', (req, res) => {
  const db = getDBState();
  res.json(db.promotions.filter(p => p.isActive));
});

// GET Approved reviews
app.get('/api/reviews', (req, res) => {
  const db = getDBState();
  res.json(db.reviews.filter(r => r.isApproved));
});

// POST Review submitted by client
app.post('/api/reviews', async (req, res) => {
  const { clientName, rating, text } = req.body;
  if (!clientName || !rating || !text) {
    return res.status(400).json({ error: 'Заполните все обязательные поля.' });
  }
  const db = getDBState();
  const newReview: Review = {
    id: 'rev_' + Math.random().toString(36).substr(2, 9),
    clientName,
    rating: Number(rating),
    text,
    date: new Date().toISOString().split('T')[0],
    isApproved: false // Await admin moderation
  };
  db.reviews.unshift(newReview);
  await writeDBState(db);
  res.json({ success: true, message: 'Отзыв успешно отправлен и будет опубликован после модерации.' });
});

// GET Available Time Slots for branch & date
app.get('/api/available-slots/:branchId/:date', (req, res) => {
  const { branchId, date } = req.params;
  const db = getDBState();
  
  // Resolve work hours schedule for this branch
  let startTime = '09:00';
  let endTime = '20:00';
  const branch = db.branches.find(b => b.id === branchId);
  const hoursStr = branch?.hours || db.config.workHours || '09:00 - 20:00';
  const matches = hoursStr.match(/(\d{2}:\d{2})\s*[-–—]\s*(\d{2}:\d{2})/);
  if (matches) {
    startTime = matches[1];
    endTime = matches[2];
  }

  const baseSlots: string[] = [];
  const getMinutes = (tStr: string) => {
    const [h, m] = tStr.split(':').map(Number);
    return h * 60 + m;
  };
  const formatMin = (m: number) => {
    const h = Math.floor(m / 60);
    const mins = m % 60;
    return `${String(h).padStart(2, '0')}:${String(mins).padStart(2, '0')}`;
  };

  const startMin = getMinutes(startTime);
  const endMin = getMinutes(endTime);
  for (let m = startMin; m <= endMin - 30; m += 30) {
    baseSlots.push(formatMin(m));
  }

  if (baseSlots.length === 0) {
    baseSlots.push(
      '09:00', '09:30', '10:00', '10:30', '11:00', '11:30',
      '12:00', '12:30', '13:00', '13:30', '14:00', '14:30',
      '15:00', '15:30', '16:00', '16:30', '17:00', '17:30',
      '18:00', '18:30', '19:00', '19:30'
    );
  }

  // Load bookings for this branch and date which are active
  const dayBookings = db.bookings.filter(b => 
    b.branchId === branchId && 
    b.date === date && 
    b.status !== 'cancelled'
  );

  // Generate mapping of blocked intervals
  const slotsWithStatus = baseSlots.map(time => {
    const slotMin = getMinutes(time);
    
    const isOccupied = dayBookings.some(booking => {
      const service = db.services.find(s => s.id === booking.serviceId);
      const duration = service ? service.duration : 30;
      
      const bookingStart = getMinutes(booking.time);
      const bookingEnd = bookingStart + duration;
      
      // A slot is blocked if it starts inside an existing booking's interval
      return slotMin >= bookingStart && slotMin < bookingEnd;
    });

    return {
      time,
      available: !isOccupied
    };
  });

  res.json(slotsWithStatus);
});

// POST Create Booking
app.post('/api/bookings', async (req, res) => {
  const {
    branchId,
    serviceId,
    date,
    time,
    carMake,
    carModel,
    carYear,
    carVin,
    clientName,
    clientPhone,
    clientEmail,
    prepaymentOption,
    notes
  } = req.body;

  if (!branchId || !serviceId || !date || !time || !clientName || !clientPhone || !clientEmail) {
    return res.status(400).json({ error: 'Заполните обязательные поля формы.' });
  }

  const db = getDBState();
  const service = db.services.find(s => s.id === serviceId);
  if (!service) {
    return res.status(404).json({ error: 'Услуга не найдена.' });
  }

  // Create booking code (AS-YYYYMMDD-XXXX)
  const cleanDate = date.replace(/-/g, '');
  const rSuffix = Math.random().toString(36).substring(2, 6).toUpperCase();
  const bookingId = `АС-${cleanDate}-${rSuffix}`;

  const amount = service.price;
  let prepaidAmount = 0;
  if (prepaymentOption === '30') {
    prepaidAmount = Math.round(amount * 0.3);
  } else if (prepaymentOption === '100') {
    prepaidAmount = amount;
  }

  const newBooking: Booking = {
    id: bookingId,
    branchId,
    serviceId,
    date,
    time,
    carMake,
    carModel,
    carYear,
    carVin: carVin || '',
    clientName,
    clientPhone,
    clientEmail,
    prepaymentOption: prepaymentOption || '0',
    status: 'pending',
    amount,
    prepaidAmount,
    paymentStatus: 'unpaid',
    createdAt: new Date().toISOString()
  };

  db.bookings.unshift(newBooking);
  await writeDBState(db);

  // Send real SMTP Email & SMS confirmations
  const branchObj = db.branches.find(b => b.id === branchId);
  const branchName = branchObj ? branchObj.name : 'АС-Авто';

  const emailHtml = `
    <div style="font-family: Arial, sans-serif; max-width: 600px; padding: 20px; border: 1px solid #e2e8f0; border-radius: 8px;">
      <h2 style="color: #2563eb; margin-top: 0;">Запись на обслуживание №${bookingId} создана успешно!</h2>
      <p>Уважаемый(ая) <strong>${clientName}</strong>,</p>
      <p>Благодарим вас за выбор автосервиса <strong>${db.config.companyName || 'АС-Авто'}</strong>.</p>
      <hr style="border: 0; border-top: 1px solid #e2e8f0; margin: 15px 0;" />
      <table style="width: 100%; border-collapse: collapse; font-size: 14px;">
        <tr>
          <td style="padding: 5px 0; color: #4a5568;"><strong>Филиал:</strong></td>
          <td style="padding: 5px 0;">${branchName}</td>
        </tr>
        <tr>
          <td style="padding: 5px 0; color: #4a5568;"><strong>Услуга:</strong></td>
          <td style="padding: 5px 0;">${service.name}</td>
        </tr>
        <tr>
          <td style="padding: 5px 0; color: #4a5568;"><strong>Дата и время:</strong></td>
          <td style="padding: 5px 0; font-weight: bold; color: #f97316;">${date} в ${time}</td>
        </tr>
        <tr>
          <td style="padding: 5px 0; color: #4a5568;"><strong>Автомобиль:</strong></td>
          <td style="padding: 5px 0;">${carMake} ${carModel} (${carYear})</td>
        </tr>
        <tr>
          <td style="padding: 5px 0; color: #4a5568;"><strong>Сумма услуги:</strong></td>
          <td style="padding: 5px 0; font-weight: bold;">${amount} ₽</td>
        </tr>
        ${prepaidAmount > 0 ? `
        <tr>
          <td style="padding: 5px 0; color: #10b981;"><strong>Сумма предоплаты:</strong></td>
          <td style="padding: 5px 0; font-weight: bold; color: #10b981;">${prepaidAmount} ₽</td>
        </tr>
        ` : ''}
      </table>
      <hr style="border: 0; border-top: 1px solid #e2e8f0; margin: 15px 0;" />
      <p style="font-size: 13px; color: #718096; margin-bottom: 0;">Если ваши планы изменятся, отменить бронь без потери предоплаты можно за 24 часа в личном кабинете или по телефону ${db.config.phone || ''}.</p>
    </div>
  `;

  sendEmail(clientEmail, `Запись на обслуживание № ${bookingId}`, emailHtml);
  sendSms(clientPhone, `Ваша запись № ${bookingId} создана. Ждем Вас ${date} в ${time}. Тел: ${db.config.phone || ''}`);

  res.json({
    success: true,
    bookingId,
    amount,
    prepaidAmount,
    message: 'Запись успешно создана! Ожидаем подтверждения.'
  });
});

// POST Initiate Payment (Yookassa simulate)
app.post('/api/payments', (req, res) => {
  const { bookingId, amount } = req.body;
  if (!bookingId || !amount) {
    return res.status(400).json({ error: 'Параметры платежа не переданы.' });
  }

  // Generate confirmation_url that redirects to our payment gateway page inside the React system
  // The React client will render a mockup secure payment processor
  const paymentId = 'pay_' + crypto.randomBytes(8).toString('hex');
  const confirmationUrl = `/payment-processing?id=${bookingId}&payment_id=${paymentId}&amount=${amount}`;

  res.json({
    success: true,
    paymentId,
    confirmationUrl
  });
});

// GET Booking history by Client Phone
app.get('/api/booking-status/:phone', (req, res) => {
  const { phone } = req.params;
  const db = getDBState();
  
  // Clean phone string to compare easily (keep numbers only)
  const cleanStr = (p: string) => p.replace(/\D/g, '');
  const searchPhone = cleanStr(phone);

  if (searchPhone.length < 5) return res.json([]);

  const userBookings = db.bookings.filter(b => cleanStr(b.clientPhone).includes(searchPhone));
  
  // Join with additional service specs
  const enriched = userBookings.map(b => {
    const service = db.services.find(s => s.id === b.serviceId);
    const branch = db.branches.find(br => br.id === b.branchId);
    return {
      ...b,
      serviceName: service ? service.name : 'Услуга автосервиса',
      serviceDuration: service ? service.duration : 30,
      branchName: branch ? branch.name : 'Филиал АС-Авто',
      branchAddress: branch ? branch.address : ''
    };
  });

  res.json(enriched);
});

// POST Cancel booking (by client, allowed > 24 hours prior)
app.post('/api/bookings/:id/cancel', async (req, res) => {
  const { id } = req.params;
  const db = getDBState();
  const idx = db.bookings.findIndex(b => b.id === id);
  if (idx === -1) {
    return res.status(404).json({ error: 'Запись не найдена.' });
  }

  const booking = db.bookings[idx];
  
  // Check the hours difference
  const bookingDateTime = new Date(`${booking.date}T${booking.time}:00`);
  const now = new Date();
  const diffHours = (bookingDateTime.getTime() - now.getTime()) / (1000 * 60 * 60);

  if (diffHours < 24) {
    return res.status(400).json({ error: 'Отмена записи невозможна менее чем за 24 часа. Свяжитесь по телефону.' });
  }

  booking.status = 'cancelled';
  await writeDBState(db);
  res.json({ success: true, message: 'Запись успешно отменена.' });
});

// POST Submit Webhook updates from secure checkout simulated frame
app.post('/api/webhook/payment', async (req, res) => {
  // Validate Webhook security signature
  const paymentToken = req.headers['payment-token'];
  if (!paymentToken || typeof paymentToken !== 'string') {
    return res.status(401).json({ error: 'Missing or invalid Payment-Token header.' });
  }

  // Calculate HMAC-SHA256 of stringified JSON body
  const rawBody = JSON.stringify(req.body);
  const hmac = crypto.createHmac('sha256', process.env.YUKASSA_SECRET_KEY || '');
  hmac.update(rawBody);
  const calculatedToken = hmac.digest('hex');

  const calculatedBuffer = Buffer.from(calculatedToken, 'utf8');
  const headerBuffer = Buffer.from(paymentToken, 'utf8');
  if (calculatedBuffer.length !== headerBuffer.length || !crypto.timingSafeEqual(calculatedBuffer, headerBuffer)) {
    console.warn('[Billing Webhook] Invalid signature token received:', paymentToken);
    return res.status(401).json({ error: 'Mismatched Payment-Token signature.' });
  }

  const { bookingId, paymentId, status } = req.body;
  const db = getDBState();
  const idx = db.bookings.findIndex(b => b.id === bookingId);
  if (idx !== -1) {
    db.bookings[idx].paymentStatus = status === 'succeeded' ? 'paid' : 'unpaid';
    db.bookings[idx].paymentId = paymentId;
    if (status === 'succeeded') {
      db.bookings[idx].status = 'confirmed';
    }
    await writeDBState(db);
    console.log(`[Billing Webhook] Successful payment for booking ${bookingId}, marked as PAID.`);
    return res.json({ success: true });
  }
  res.status(404).json({ error: 'Booking not found' });
});

// POST Installer configuration
app.post('/api/installer/setup', async (req, res) => {
  const db = getDBState();
  if (db.config.isInstalled) {
    return res.status(400).json({ error: 'Продукт уже установлен.' });
  }

  const {
    companyName,
    primaryColor,
    accentColor,
    bgColor,
    phone,
    email,
    workHours,
    branches,
    services,
    billingProvider,
    billingKeys,
    smtpHost,
    smtpPort,
    smtpUser,
    smtpPass,
    smsProvider,
    smsLogin,
    smsPassword,
    adminUser
  } = req.body;

  // 1. Save general config
  db.config = {
    companyName: companyName || 'АС-Авто',
    primaryColor: primaryColor || '#2563eb',
    accentColor: accentColor || '#f97316',
    bgColor: bgColor || '#ffffff',
    phone: phone || '+7 (817) 200-00-00',
    email: email || 'info@as-auto.ru',
    workHours: workHours || 'Пн-Вс: 09:00 - 20:00',
    billingProvider: billingProvider || 'none',
    billingKeys: billingKeys || {},
    smtpHost: smtpHost || '',
    smtpPort: smtpPort || 587,
    smtpUser: smtpUser || '',
    smtpPass: smtpPass || '',
    smsProvider: smsProvider || 'none',
    smsLogin: smsLogin || '',
    smsPassword: smsPassword || '',
    isAdminCreated: true,
    isInstalled: true
  };

  // 2. Set Branches
  if (branches && branches.length > 0) {
    db.branches = branches;
  }

  // 3. Set Services
  if (services && services.length > 0) {
    db.services = services;
  }

  // 4. Set Admin
  if (adminUser && adminUser.username && adminUser.password) {
    const freshAdmin: AdminUser = {
      username: adminUser.username,
      email: adminUser.email || 'admin@as-auto.ru',
      passwordHash: hashPassword(adminUser.password),
      role: 'admin'
    };
    db.admins = [freshAdmin];
  }

  await writeDBState(db);

  res.json({ success: true, message: 'Установка завершена успешно! Система готова к работе.' });
});

// POST Contacts/Feedback Form
app.post('/api/contact', (req, res) => {
  const { name, phone, message } = req.body;
  console.log(`[Contact Form Submittal] From ${name} (${phone}): "${message}"`);
  res.json({ success: true, message: 'Ваша заявка успешно отправлена! Менеджер свяжется с вами в течение 10 минут.' });
});


// =================== PROTECTED ADMIN API ENDPOINTS ===================

// POST Login for admin
app.post('/api/auth/login', loginLimiter, (req, res) => {
  const { username, password } = req.body;
  if (!username || !password) {
    return res.status(400).json({ error: 'Введите имя пользователя и пароль.' });
  }

  const db = getDBState();
  const admin = db.admins.find(a => a.username === username);
  if (!admin) {
    return res.status(401).json({ error: 'Неверные учетные данные администратора.' });
  }

  const computedHash = hashPassword(password);
  if (computedHash !== admin.passwordHash) {
    return res.status(401).json({ error: 'Неверные учетные данные.' });
  }

  const token = signToken({ username: admin.username, role: admin.role });
  res.json({
    success: true,
    token,
    user: {
      username: admin.username,
      role: admin.role,
      email: admin.email
    }
  });
});

// GET Dashboard Metrics
app.get('/api/admin/dashboard', authMiddleware, (req, res) => {
  const db = getDBState();
  const bookings = db.bookings;

  // Calculate stats
  const now = new Date();
  const todayStr = now.toISOString().split('T')[0];

  const todayBookings = bookings.filter(b => b.date === todayStr);
  const totalBookingsCount = bookings.length;
  const activeBookingsCount = bookings.filter(b => b.status !== 'cancelled').length;

  // Earnings calculations
  const totalRevenue = bookings
    .filter(b => b.paymentStatus === 'paid')
    .reduce((acc, b) => acc + b.amount, 0);

  const prepaymentRevenue = bookings
    .filter(b => b.paymentStatus === 'paid' && b.prepaymentOption !== '100')
    .reduce((acc, b) => acc + b.prepaidAmount, 0);

  const totalCollected = bookings
    .filter(b => b.paymentStatus === 'paid')
    .reduce((acc, b) => acc + (b.prepaymentOption === '100' ? b.amount : b.prepaidAmount), 0);

  // Group revenues by date for charts
  const revenueByDay: { [key: string]: number } = {};
  bookings.filter(b => b.paymentStatus === 'paid').forEach(b => {
    revenueByDay[b.date] = (revenueByDay[b.date] || 0) + b.amount;
  });

  const revenueChartData = Object.keys(revenueByDay).sort().slice(-14).map(date => ({
    date,
    amount: revenueByDay[date]
  }));

  // Service popular counts
  const servicePopularity: { [key: string]: { name: string; count: number; totalRev: number } } = {};
  bookings.forEach(b => {
    const srv = db.services.find(s => s.id === b.serviceId);
    const srvName = srv ? srv.name : 'Другая услуга';
    if (!servicePopularity[b.serviceId]) {
      servicePopularity[b.serviceId] = { name: srvName, count: 0, totalRev: 0 };
    }
    servicePopularity[b.serviceId].count += 1;
    if (b.paymentStatus === 'paid') {
      servicePopularity[b.serviceId].totalRev += b.amount;
    }
  });

  const topServices = Object.values(servicePopularity)
    .sort((a, b) => b.count - a.count)
    .slice(0, 5);

  // Load by hour
  const hourlyLoad: { [key: string]: number } = {};
  bookings.forEach(b => {
    const hour = b.time.split(':')[0] + ':00';
    hourlyLoad[hour] = (hourlyLoad[hour] || 0) + 1;
  });

  const loadChartData = Object.keys(hourlyLoad).sort().map(hour => ({
    hour,
    bookings: hourlyLoad[hour]
  }));

  res.json({
    metrics: {
      todayBookingCount: todayBookings.length,
      todayActiveBookingCount: todayBookings.filter(b => b.status !== 'cancelled').length,
      totalRevenue,
      totalCollected,
      totalBookingsCount,
      activeBookingsCount,
      pendingCount: bookings.filter(b => b.status === 'pending').length,
      conversionRate: totalBookingsCount > 0 ? Math.round((bookings.filter(b => b.status === 'completed' || b.paymentStatus === 'paid').length / totalBookingsCount) * 100) : 85
    },
    charts: {
      revenue: revenueChartData,
      topServices,
      hourlyLoad: loadChartData
    }
  });
});

// GET All bookings with pagination & filters
app.get('/api/admin/bookings', authMiddleware, (req, res) => {
  const db = getDBState();
  
  // Extract query parameters
  let page = parseInt(req.query.page as string) || 1;
  let limit = parseInt(req.query.limit as string) || 50;
  if (limit > 200) limit = 200;
  
  const { status, branchId, dateFrom, dateTo } = req.query;

  let filtered = db.bookings.map(b => {
    const service = db.services.find(s => s.id === b.serviceId);
    const branch = db.branches.find(br => br.id === b.branchId);
    return {
      ...b,
      serviceName: service ? service.name : 'Удаленная услуга',
      branchName: branch ? branch.name : 'Удаленный филиал'
    };
  });

  // Apply sequential filtering
  if (status) {
    filtered = filtered.filter(b => b.status === status);
  }
  if (branchId) {
    filtered = filtered.filter(b => b.branchId === branchId);
  }
  if (dateFrom) {
    filtered = filtered.filter(b => b.date >= (dateFrom as string));
  }
  if (dateTo) {
    filtered = filtered.filter(b => b.date <= (dateTo as string));
  }

  const total = filtered.length;
  const totalPages = Math.ceil(total / limit) || 1;
  const startIndex = (page - 1) * limit;
  const endIndex = startIndex + limit;
  const paginatedResult = filtered.slice(startIndex, endIndex);

  res.json({
    data: paginatedResult,
    total,
    page,
    totalPages
  });
});

// PUT Booking Status Update
app.put('/api/admin/bookings/:id/status', authMiddleware, async (req, res) => {
  const { id } = req.params;
  const { status, paymentStatus } = req.body;
  
  const db = getDBState();
  const idx = db.bookings.findIndex(b => b.id === id);
  if (idx === -1) {
    return res.status(404).json({ error: 'Запись не найдена.' });
  }

  if (status) db.bookings[idx].status = status;
  if (paymentStatus) db.bookings[idx].paymentStatus = paymentStatus;

  await writeDBState(db);
  res.json({ success: true, booking: db.bookings[idx] });
});

// DELETE Booking
app.delete('/api/admin/bookings/:id', authMiddleware, async (req, res) => {
  const { id } = req.params;
  const db = getDBState();
  const idx = db.bookings.findIndex(b => b.id === id);
  if (idx === -1) {
    return res.status(404).json({ error: 'Запись не найдена.' });
  }

  db.bookings.splice(idx, 1);
  await writeDBState(db);
  res.json({ success: true });
});

// BRANCHES Admin Operations
app.post('/api/admin/branches', authMiddleware, async (req, res) => {
  const db = getDBState();
  const newBranch: Branch = {
    id: 'br_' + Math.random().toString(36).substr(2, 9),
    ...req.body,
    isActive: true
  };
  db.branches.push(newBranch);
  await writeDBState(db);
  res.json({ success: true, branch: newBranch });
});

app.put('/api/admin/branches/:id', authMiddleware, async (req, res) => {
  const { id } = req.params;
  const db = getDBState();
  const idx = db.branches.findIndex(b => b.id === id);
  if (idx === -1) return res.status(404).json({ error: 'Филиал не найден.' });

  db.branches[idx] = { ...db.branches[idx], ...req.body };
  await writeDBState(db);
  res.json({ success: true, branch: db.branches[idx] });
});

app.delete('/api/admin/branches/:id', authMiddleware, async (req, res) => {
  const { id } = req.params;
  const db = getDBState();
  const idx = db.branches.findIndex(b => b.id === id);
  if (idx === -1) return res.status(404).json({ error: 'Филиал не найден.' });

  db.branches.splice(idx, 1);
  await writeDBState(db);
  res.json({ success: true });
});

// SERVICES Admin Operations
app.post('/api/admin/services', authMiddleware, async (req, res) => {
  const db = getDBState();
  const newSrv: Service = {
    id: 'srv_' + Math.random().toString(36).substr(2, 9),
    ...req.body,
    price: Number(req.body.price),
    oldPrice: req.body.oldPrice ? Number(req.body.oldPrice) : undefined,
    duration: Number(req.body.duration),
    sortOrder: db.services.length + 1,
    isActive: true
  };
  db.services.push(newSrv);
  await writeDBState(db);
  res.json({ success: true, service: newSrv });
});

app.put('/api/admin/services/:id', authMiddleware, async (req, res) => {
  const { id } = req.params;
  const db = getDBState();
  const idx = db.services.findIndex(s => s.id === id);
  if (idx === -1) return res.status(404).json({ error: 'Услуга не найдена.' });

  db.services[idx] = {
    ...db.services[idx],
    ...req.body,
    price: Number(req.body.price),
    oldPrice: req.body.oldPrice ? Number(req.body.oldPrice) : undefined,
    duration: Number(req.body.duration)
  };
  await writeDBState(db);
  res.json({ success: true, service: db.services[idx] });
});

app.delete('/api/admin/services/:id', authMiddleware, async (req, res) => {
  const { id } = req.params;
  const db = getDBState();
  const idx = db.services.findIndex(s => s.id === id);
  if (idx === -1) return res.status(404).json({ error: 'Услуга не найдена.' });

  db.services.splice(idx, 1);
  await writeDBState(db);
  res.json({ success: true });
});

// PROMOTIONS Admin CRUD
app.post('/api/admin/promotions', authMiddleware, async (req, res) => {
  const db = getDBState();
  const newProp: Promotion = {
    id: 'prop_' + Math.random().toString(36).substr(2, 9),
    ...req.body,
    discountValue: Number(req.body.discountValue),
    isActive: true
  };
  db.promotions.push(newProp);
  await writeDBState(db);
  res.json({ success: true, promotion: newProp });
});

app.put('/api/admin/promotions/:id', authMiddleware, async (req, res) => {
  const { id } = req.params;
  const db = getDBState();
  const idx = db.promotions.findIndex(p => p.id === id);
  if (idx === -1) return res.status(404).json({ error: 'Акция не найдена.' });

  db.promotions[idx] = {
    ...db.promotions[idx],
    ...req.body,
    discountValue: Number(req.body.discountValue)
  };
  await writeDBState(db);
  res.json({ success: true, promotion: db.promotions[idx] });
});

app.delete('/api/admin/promotions/:id', authMiddleware, async (req, res) => {
  const { id } = req.params;
  const db = getDBState();
  const idx = db.promotions.findIndex(p => p.id === id);
  if (idx === -1) return res.status(404).json({ error: 'Акция не найдена.' });

  db.promotions.splice(idx, 1);
  await writeDBState(db);
  res.json({ success: true });
});

// REVIEWS Moderation Operations
app.put('/api/admin/reviews/:id/approve', authMiddleware, async (req, res) => {
  const { id } = req.params;
  const db = getDBState();
  const idx = db.reviews.findIndex(r => r.id === id);
  if (idx === -1) return res.status(404).json({ error: 'Отзыв не найден.' });

  db.reviews[idx].isApproved = true;
  await writeDBState(db);
  res.json({ success: true, review: db.reviews[idx] });
});

app.put('/api/admin/reviews/:id/reply', authMiddleware, async (req, res) => {
  const { id } = req.params;
  const { replyText } = req.body;
  const db = getDBState();
  const idx = db.reviews.findIndex(r => r.id === id);
  if (idx === -1) return res.status(404).json({ error: 'Отзыв не найден.' });

  db.reviews[idx].replyText = replyText;
  db.reviews[idx].isApproved = true; // Auto approve review upon replying
  await writeDBState(db);
  res.json({ success: true, review: db.reviews[idx] });
});

app.delete('/api/admin/reviews/:id', authMiddleware, async (req, res) => {
  const { id } = req.params;
  const db = getDBState();
  const idx = db.reviews.findIndex(r => r.id === id);
  if (idx === -1) return res.status(404).json({ error: 'Отзыв не найден.' });

  db.reviews.splice(idx, 1);
  await writeDBState(db);
  res.json({ success: true });
});

// EXPORT TO EXCEL / CSV Bookings
app.get('/api/admin/export/bookings', authMiddleware, (req, res) => {
  const db = getDBState();
  const bookings = db.bookings;

  // Let's create a dynamic CSV string
  let csv = '\uFEFF'; // Add UTF-8 BOM for Excel compatibility
  csv += 'ID записи,Филиал,Услуга,Дата,Время,Марка автомобиля,Модель автомобиля,Год,ФИО клиента,Телефон,Email,Предоплата %,Общая сумма,Предоплачено,Статус записи,Статус оплаты,Дата создания\n';

  bookings.forEach(b => {
    const service = db.services.find(s => s.id === b.serviceId);
    const branch = db.branches.find(br => br.id === b.branchId);
    const serviceName = service ? service.name : 'Unknown';
    const branchName = branch ? branch.name : 'Unknown';

    const row = [
      b.id,
      `"${branchName.replace(/"/g, '""')}"`,
      `"${serviceName.replace(/"/g, '""')}"`,
      b.date,
      b.time,
      `"${b.carMake.replace(/"/g, '""')}"`,
      `"${b.carModel.replace(/"/g, '""')}"`,
      b.carYear,
      `"${b.clientName.replace(/"/g, '""')}"`,
      `"${b.clientPhone}"`,
      `"${b.clientEmail}"`,
      b.prepaymentOption,
      b.amount,
      b.prepaidAmount,
      b.status,
      b.paymentStatus,
      b.createdAt
    ];

    csv += row.join(',') + '\n';
  });

  res.setHeader('Content-Type', 'text/csv; charset=utf-8');
  res.setHeader('Content-Disposition', 'attachment; filename=bookings_export.csv');
  res.send(csv);
});

// UPDATE Admin General Settings
app.put('/api/admin/settings', authMiddleware, async (req, res) => {
  const db = getDBState();
  const { companyName, primaryColor, accentColor, bgColor, phone, email, workHours, billingProvider, billingKeys, smsProvider, smsLogin, smsPassword } = req.body;

  db.config = {
    ...db.config,
    companyName: companyName || db.config.companyName,
    primaryColor: primaryColor || db.config.primaryColor,
    accentColor: accentColor || db.config.accentColor,
    bgColor: bgColor || db.config.bgColor,
    phone: phone || db.config.phone,
    email: email || db.config.email,
    workHours: workHours || db.config.workHours,
    billingProvider: billingProvider || db.config.billingProvider,
    billingKeys: billingKeys || db.config.billingKeys,
    smsProvider: smsProvider || db.config.smsProvider,
    smsLogin: smsLogin || db.config.smsLogin,
    smsPassword: smsPassword || db.config.smsPassword,
  };

  await writeDBState(db);
  res.json({ success: true, config: db.config });
});


// =================== CLIENT (CUSTOMER) AUTHENTICATION & PORTAL ENDPOINTS ===================

// GET Logged-in Customer Profile
app.get('/api/customer/me', (req, res) => {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Потребуется авторизация.' });
  }
  const token = authHeader.split(' ')[1];
  const payload = verifyToken(token);
  if (!payload || payload.role !== 'customer') {
    return res.status(401).json({ error: 'Сессия просрочена. Войдите заново.' });
  }

  const db = getDBState();
  const customer = db.customers?.find(c => c.id === payload.id);
  if (!customer) {
    return res.status(404).json({ error: 'Профиль клиента не найден.' });
  }

  res.json({
    id: customer.id,
    email: customer.email,
    fullName: customer.fullName,
    phone: customer.phone,
    createdAt: customer.createdAt
  });
});

// GET Bookings linked to currently active Customer
app.get('/api/customer/bookings', (req, res) => {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Потребуется авторизация.' });
  }
  const token = authHeader.split(' ')[1];
  const payload = verifyToken(token);
  if (!payload || payload.role !== 'customer') {
    return res.status(401).json({ error: 'Сессия просрочена или неверная.' });
  }

  const db = getDBState();
  const customer = db.customers?.find(c => c.id === payload.id);
  if (!customer) {
    return res.status(404).json({ error: 'Профиль не найден.' });
  }

  // Find bookings matching customer email, phone OR customer ID matching
  const norm = (p: string) => p.replace(/\D/g, '');
  const custPhoneNorm = norm(customer.phone);

  const matchedBookings = db.bookings.filter(b => {
    const bookingPhoneNorm = norm(b.clientPhone);
    const emailMatch = b.clientEmail.toLowerCase().trim() === customer.email.toLowerCase().trim();
    const phoneMatch = custPhoneNorm && bookingPhoneNorm && (custPhoneNorm === bookingPhoneNorm || custPhoneNorm.endsWith(bookingPhoneNorm) || bookingPhoneNorm.endsWith(custPhoneNorm));
    return emailMatch || phoneMatch;
  });

  // Enrich matched details with branch name & service name
  const enriched = matchedBookings.map(b => {
    const service = db.services.find(s => s.id === b.serviceId);
    const branch = db.branches.find(br => br.id === b.branchId);
    return {
      ...b,
      serviceName: service ? service.name : 'Услуга',
      branchName: branch ? branch.name : 'Филиал СТО'
    };
  });

  res.json(enriched);
});

// POST Client Registration
app.post('/api/auth/customer/register', async (req, res) => {
  const { email, password, fullName, phone } = req.body;
  if (!email || !password || !fullName || !phone) {
    return res.status(400).json({ error: 'Заполните все обязательные поля.' });
  }

  const db = getDBState();
  if (!db.customers) db.customers = [];

  const normalizedEmail = email.toLowerCase().trim();
  const exists = db.customers.some(c => c.email.toLowerCase().trim() === normalizedEmail);
  if (exists) {
    return res.status(400).json({ error: 'Пользователь с такой почтой уже зарегистрирован.' });
  }

  const customerId = 'cust_' + crypto.randomBytes(6).toString('hex');
  const newCustomer = {
    id: customerId,
    email: normalizedEmail,
    passwordHash: hashPassword(password),
    fullName,
    phone,
    createdAt: new Date().toISOString()
  };

  db.customers.push(newCustomer);
  await writeDBState(db);

  // Issue Token
  const token = signToken({ id: customerId, email: normalizedEmail, fullName, role: 'customer' });

  res.json({
    success: true,
    token,
    customer: {
      id: customerId,
      email: normalizedEmail,
      fullName,
      phone
    }
  });
});

// POST Client Login
app.post('/api/auth/customer/login', (req, res) => {
  const { email, password } = req.body;
  if (!email || !password) {
    return res.status(400).json({ error: 'Заполните email и пароль.' });
  }

  const db = getDBState();
  if (!db.customers) db.customers = [];

  const normalizedEmail = email.toLowerCase().trim();
  const customer = db.customers.find(c => c.email.toLowerCase().trim() === normalizedEmail);
  if (!customer) {
    return res.status(401).json({ error: 'Пользователь с таким email не найден.' });
  }

  const inputHash = hashPassword(password);
  if (customer.passwordHash !== inputHash) {
    return res.status(401).json({ error: 'Неверный пароль.' });
  }

  const token = signToken({ id: customer.id, email: customer.email, fullName: customer.fullName, role: 'customer' });

  res.json({
    success: true,
    token,
    customer: {
      id: customer.id,
      email: customer.email,
      fullName: customer.fullName,
      phone: customer.phone
    }
  });
});


// =================== ASSET & FRONTEND HANDLERS ===================

async function startServer() {
  // Init MariaDB connection pool first
  await initMariaDB();

  // Vite integration in development
  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req: Request, res: Response) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Server running on http://0.0.0.0:${PORT}`);
  });
}

startServer();
