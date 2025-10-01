"use strict";
/**
 * Core type definitions for the Kalendis API
 * All dates are ISO 8601 strings to preserve timezone information
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.Role = exports.DaysOfWeek = void 0;
// ============= Enums =============
var DaysOfWeek;
(function (DaysOfWeek) {
    DaysOfWeek["SUNDAY"] = "SUNDAY";
    DaysOfWeek["MONDAY"] = "MONDAY";
    DaysOfWeek["TUESDAY"] = "TUESDAY";
    DaysOfWeek["WEDNESDAY"] = "WEDNESDAY";
    DaysOfWeek["THURSDAY"] = "THURSDAY";
    DaysOfWeek["FRIDAY"] = "FRIDAY";
    DaysOfWeek["SATURDAY"] = "SATURDAY";
})(DaysOfWeek || (exports.DaysOfWeek = DaysOfWeek = {}));
var Role;
(function (Role) {
    Role["STANDARD"] = "STANDARD";
    Role["ADMIN"] = "ADMIN";
})(Role || (exports.Role = Role = {}));
//# sourceMappingURL=types.js.map