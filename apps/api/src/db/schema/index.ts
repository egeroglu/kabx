/**
 * Tüm tablolar buradan dışa açılır; Drizzle client'ı bu barrel ile kurulur.
 * Yeni bir modül tablo eklediğinde buraya export satırı ekler.
 */
export * from './account.js';
export * from './app-config.js';
export * from './auth.js';
export * from './users.js';
