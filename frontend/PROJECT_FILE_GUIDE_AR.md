# خريطة ملفات مشروع STARCO

هذا الدليل يشرح **ملفات المصدر التي نعدلها** فقط. لا تعدل `node_modules` أو `dist` أو `package-lock.json` يدويًا.

## أين أعدل بسرعة؟

| المطلوب | ابدأ من |
|---|---|
| صفحة أو شاشة | `frontend/src/pages/` |
| جزء صغير داخل الشاشة | `frontend/src/components/` |
| تصميم/CSS | `frontend/src/styles/` |
| طلب API من الواجهة | `frontend/src/services/` |
| صلاحيات/بيانات مشتركة بالواجهة | `frontend/src/context/` و`frontend/src/utils/` |
| API أو صلاحيات في السيرفر | `backend/controllers/` ثم `backend/routers/` |
| بيانات MongoDB | `backend/DB/schema/` |
| R2 أو واتساب أو المهام المجدولة | `backend/services/` |

---

# Frontend — `D:\Starco V3\frontend\src`

## البداية والجذر

- `main.jsx`: يشغّل React ويغلف التطبيق بالـProviders العامة.
- `App.jsx`: خريطة صفحات الموقع (Routes)، الـToasts، والحماية العامة لبعض الإدخالات.
- `index.css`: الألوان العامة، الخطوط، المتغيرات، وسلوك الأزرار أثناء التحميل.

## الصور والخطوط — `assets/`

- `fonts/Tajawal-Regular.ttf`: خط Tajawal العادي.
- `fonts/Tajawal-Medium.ttf`: خط Tajawal المتوسط.
- `fonts/Tajawal-Bold.ttf`: خط Tajawal العريض.
- `fonts/Tajawal-Black.ttf`: خط Tajawal الثقيل للعناوين.
- `images/logo.jpg`: شعار Starco.
- `images/login-bg.png` و`login-bg-clean.png`: خلفيات شاشة الدخول.
- `images/1.svg`: خلفية أول صفحة في عرض السعر.
- `images/2.svg`: خلفية جداول الأسعار في عرض السعر.
- `images/3.svg`: خلفية آخر صفحة في عرض السعر.
- `images/1 PDF.svg`: قالب أول صفحة في PDF التنفيذ.
- `images/2 PDF.svg`: قالب الصفحات التقنية في PDF التنفيذ.
- `images/3 PDF.svg`: قالب صفحة معرض الصور في PDF التنفيذ.
- `images/4 PDF.svg`: قالب آخر صفحة في PDF التنفيذ.

> هذه القوالب صور/تصميم وليست منطق صلاحيات. لا تغيرها إلا إذا أردت تغيير شكل الـPDF.

## الصفحات — `pages/`

- `Login.jsx`: صفحة الدخول، تستدعي نموذج الدخول.
- `Register.jsx`: صفحة إنشاء الحساب.
- `GoogleRegisterCompletion.jsx`: إكمال بيانات الحساب بعد الدخول بجوجل.
- `Dashboard.jsx`: يختار Dashboard المناسب للرول الحالي ويجلب بياناته.
- `Projects.jsx`: قائمة المشاريع والبحث والفلترة العامة.
- `ProjectFolder.jsx`: داخل المشروع؛ يعرض لوحاته ويضيف/يحذف لوحة ويعلّم إشعارات المشروع كمقروءة.
- `EditProject.jsx`: الصفحة الرئيسية لتحرير/عرض لوحة محددة، وتختار محرر التسعير أو التنفيذ حسب الحالة والرول.
- `NewProject.jsx`: إنشاء مشروع جديد للمندوب.
- `Panels.jsx`: فهرس كل اللوحات مع فلترة الحالة والمرحلة والبحث.
- `ClientProjectPreview.jsx`: رابط العرض الخارجي للعميل؛ يعرض صور عرض السعر أو PDF التنفيذ بدون تسجيل دخول.
- `Clients.jsx`: إدارة قائمة العملاء.
- `Configuration.jsx`: إعدادات الأنواع والأسعار والنحاس والقوالب.
- `Users.jsx`: إدارة الحسابات المعتمدة.
- `PendingUsers.jsx`: الحسابات التي بانتظار الموافقة.
- `DeletedProjects.jsx`: سلة المشاريع المحذوفة واستعادتها أو حذفها النهائي.
- `Profile.jsx`: بيانات الحساب الشخصي.

## المسارات والحماية — `routes/`

- `ProtectedRoute.jsx`: يمنع دخول غير المسجل إلى صفحات الموقع الداخلية.
- `PublicRoute.jsx`: يمنع المستخدم المسجل من الرجوع لصفحات الدخول بلا داعٍ.
- `RoleRoute.jsx`: يمنع الرول غير المسموح من فتح صفحة محددة.

## الحالة المشتركة — `context/`

- `AuthContext.jsx`: المستخدم الحالي، التوكن، تحميل الملف الشخصي، وتبديل الحسابات.
- `ProjectContext.jsx`: المشروع المفتوح واللوحة المختارة والحفظ التلقائي وتحديث بيانات المشروع.
- `NotificationContext.jsx`: جرس الإشعارات، القراءة، الـPush، والتحديث الهادئ كل 30 ثانية.
- `ThemeContext.jsx`: الوضع الفاتح/الداكن وحفظ الاختيار.

## الاتصال بالباك إند — `services/`

- `api.js`: Axios الأساسي؛ يضع رابط السيرفر والتوكن ويتعامل مع أخطاء الطلبات.
- `authApi.js`: تسجيل الدخول والتسجيل وGoogle.
- `clientsAPI.js`: قراءة وتعديل العملاء.
- `projectsAPI.js`: كل عمليات المشاريع واللوحات؛ توقيع رفع R2، رفع ملفات التنفيذ والتصنيع، روابط تنزيل R2، ومرفقات المشروع.
- `dashboardAPI.js`: بيانات وإحصاءات لوحات التحكم.
- `dashboardNotesAPI.js`: ملاحظات الـDashboard.
- `notificationsAPI.js`: قائمة الإشعارات، قراءتها، واشتراك إشعارات الجهاز.
- `linkedAccountsAPI.js`: الحسابات المرتبطة والتبديل بينها.
- `profileAPI.js`: تعديل الملف الشخصي.
- `systemConfigurationAPI.js`: إعدادات النظام.
- `usersAPI.js`: المستخدمون، الموافقات، والحذف والاستعادة.

## أدوات مساعدة — `utils/`

- `roles.js`: أسماء الرولات، ترتيبها، وصلاحيات/مراحل المشرفين.
- `dashboardData.js`: حساب ما يجب عرضه في الداشبورد والإجراء الحالي لكل لوحة.
- `defaultProject.js`: شكل البيانات الافتراضي للمشروع الجديد.
- `priceCalculator.js`: حساب صفوف وجداول الأسعار.
- `projectPdf.js`: يبني عرض السعر والـPDF وصور المعاينة؛ يحافظ على أسطر اسم اللوحة.
- `executionPdf.js`: يبني PDF التنفيذ وصور معاينته المخففة للموبايل.
- `egyptWorkingDays.js`: حساب أيام العمل المصرية والمواعيد.
- `copperBranches.js`: تنظيم مفاتيح النحاس والفروع.
- `copperDefaults.js`: القيم الافتراضية للنحاس.
- `thicknessOptions.js`: خيارات سماكات الصاج.
- `panelEditing.js`: قواعد من يفتح/يعدل اللوحة وحالة التحرير.
- `panelNameDirection.js`: يحدد اتجاه اسم اللوحة العربي/الإنجليزي.
- `phoneNumber.js`: تطبيع أرقام الهاتف.
- `textSearch.js`: بحث نصي مرن عربي/إنجليزي.
- `errorToast.js`: إظهار أخطاء الـAPI للمستخدم بشكل مفهوم.
- `whatsappErrorToast.js`: إظهار أخطاء واتساب بشكل مفهوم.

## مكونات الدخول والحساب — `components/auth/`

- `AuthLayout.jsx`: إطار صفحات الدخول والتسجيل.
- `AuthInput.jsx`: حقل إدخال موحد لصفحات الدخول.
- `AuthTabs.jsx`: تبويبات الدخول/التسجيل.
- `LoginForm.jsx`: منطق نموذج الدخول.
- `RegisterForm.jsx`: منطق نموذج التسجيل.
- `GoogleRegistrationCompletion.jsx`: نموذج إكمال التسجيل بعد Google.
- `AddAccountModal.jsx`: نافذة إضافة حساب مرتبط.

## مكونات مشتركة — `components/common/`

- `StyledSelect.jsx`: Select موحد بتصميم الموقع.
- `activity/ActivityContext.jsx`: يتتبع عمليات الحفظ/الرفع/الحذف كي يمنع الضغط المكرر.
- `activity/ActivityCenter.jsx`: بطاقة حالة العمليات على سطح المكتب.
- `activity/activityCenter.css`: شكل بطاقة حالة العمليات؛ مخفية على الموبايل.
- `errors/ErrorDetailsModal.jsx`: نافذة تفاصيل الخطأ الفني عند الحاجة.
- `errors/errorDetails.css`: تصميم نافذة الخطأ.

## الشكل العام — `components/layout/`

- `DashboardLayout.jsx`: يجمع الـSidebar والـTopbar ومحتوى الصفحة.
- `Sidebar.jsx`: القائمة الجانبية حسب الرول والصلاحيات.
- `Topbar.jsx`: الشريط العلوي: الثيم، الجرس، الحسابات المرتبطة، والملف الشخصي.
- `UserAvatar.jsx`: صورة/حرف المستخدم الدائري.

## المشاريع واللوحات — `components/projects/`

- `ProjectsHeader.jsx`: عنوان المشروع/اللوحات والبحث والفلاتر وزر التحديث.
- `ProjectsGrid.jsx`: شبكة بطاقات المشاريع.
- `ProjectCard.jsx`: بطاقة مشروع واحدة وحالة الإشعار عليها.
- `PanelCard.jsx`: بطاقة لوحة داخل المشروع وحالة الإشعار عليها.
- `PanelIndexCard.jsx`: بطاقة لوحة في صفحة كل اللوحات.
- `PanelEditAction.jsx`: زر فتح جلسة تعديل اللوحة.
- `PanelEditSummary.jsx`: ملخص بيانات اللوحة في صفحة تحريرها.

## محرر المشروع — `components/projects/projectEditor/`

- `MarketingProjectEditor.jsx`: شاشة المندوب لتأكيد بيانات المشروع والتسعير.
- `PanelEditor.jsx`: محرر بيانات اللوحة أثناء الرسم والتسعير.
- `ProjectInfo.jsx`: بيانات المشروع والعميل الأساسية.
- `PanelName.jsx`: حقل اسم اللوحة متعدد السطور.
- `PanelsTabs.jsx`: تبويبات/اختيار اللوحات داخل المشروع.
- `ProjectPrices.jsx`: أسعار الصاج والدهان ونسبة الربح.
- `PriceTables.jsx`: جداول نتائج السعر.
- `ProductParts.jsx`: مكونات/قطع اللوحة.
- `AddPartModal.jsx`: نافذة إضافة قطعة جديدة.
- `AdditionalSupplies.jsx`: مستلزمات إضافية للوحة.
- `CopperCalculator.jsx`: حاسبة مكونات النحاس.
- `SaveActions.jsx`: أزرار الحفظ والاعتماد والانتقال.
- `WhatsappProjectData.jsx`: صور وتسجيلات ومقاطع مرفقات واتساب/R2؛ فيه زر تحديث المرفقات.
- `ExecutionPdfWorkspace.jsx`: إنشاء PDF التنفيذ، رفع ملفاته، ملفات التصنيع، مراحل الإنتاج، والمواعيد.
- `ManufacturingSettings.jsx`: إعدادات بيانات التصنيع المرتبطة باللوحة.

## لوحات التحكم — `components/dashboard/`

- `EngineerDashboard.jsx`: Dashboard مهندس الرسم والتسعير.
- `FullEngineerDashboard.jsx`: Dashboard الـFull Engineer؛ يجمع الرسم/التسعير والإنتاج.
- `ProductionManagerDashboard.jsx`: Dashboard مدير/مهندس الإنتاج.
- `ProductionSupervisorDashboard.jsx`: Dashboard المشرفين؛ يعرض المرحلة المسموحة فقط.
- `MarketerDashboard.jsx`: Dashboard المندوب.
- `MarketingManagerDashboard.jsx`: Dashboard مدير التسويق.
- `OwnerManagerDashboard.jsx`: Dashboard المالك والإحصاءات العامة.
- `DashboardHeader.jsx`: عنوان وفلاتر تاريخ مشتركة للـDashboard.
- `StatCard.jsx`: بطاقة رقم/إحصاء.
- `DashboardDonut.jsx`: الرسم الدائري.
- `DashboardAverage.jsx`: عرض المتوسطات.
- `DashboardName.jsx`: يعرض الاسم مع اتجاه صحيح عربي/إنجليزي.
- `DashboardTasksModal.jsx`: نافذة كل المهام أو التفاصيل.
- `MarketingTeamModal.jsx`: نافذة فريق التسويق.
- `QuickActions.jsx`: أزرار الإجراءات السريعة.
- `RecentProjects.jsx`: المشاريع الحديثة.

## المستخدمون — `components/users/`

- `UsersHeader.jsx`: عنوان/بحث صفحة المستخدمين.
- `UsersTable.jsx`: جدول المستخدمين.
- `UserRow.jsx`: صف مستخدم واحد وإجراءاته.
- `DeletedUsersList.jsx`: قائمة المستخدمين المحذوفين.

## ملفات التصميم — `styles/`

- `auth.css`: يجمع تصميم صفحات الدخول.
- `styles/auth/base.css`: حقول وأزرار ونموذج الدخول الأساسي.
- `styles/auth/brand-panel.css`: شعار ونصوص/خلفية جزء العلامة التجارية.
- `styles/auth/responsive-layout.css`: استجابة صفحة الدخول للشاشات الصغيرة.
- `styles/auth/viewport-layout.css`: قياسات وتوزيع صفحة الدخول بحسب حجم الشاشة.
- `dashboard.css` و`dashboardHome.css`: تصميم لوحة التحكم العامة.
- `ClientProjectPreview.css`: صفحة رابط عرض السعر/PDF التنفيذ الخارجي.
- `configuration.css`: يجمع تصميم الإعدادات.
- `styles/configuration/base.css`: أساس صفحة الإعدادات.
- `styles/configuration/copper.css`: أقسام النحاس.
- `styles/configuration/drive.css`: بقايا/شكل إعدادات الربط القديمة؛ لا تستخدم لرفع R2 الجديد.
- `styles/configuration/panel-types-and-parts.css`: أنواع اللوحات والقطع.
- `styles/configuration/pricing.css`: الأسعار ونسب الربح.
- `styles/configuration/responsive.css`: استجابة الإعدادات للموبايل.
- `styles/configuration/templates.css`: القوالب وإعدادات مظهرها.
- `management.css`: التصميم العام لصفحات الإدارة.
- `profile.css`: صفحة الملف الشخصي.
- `ProjectEditor.css`: يجمع تصميم محرر المشروع.
- `projects.css`: يجمع تصميم المشاريع واللوحات.
- `users.css`: تصميم صفحات المستخدمين.
- `styles/dashboard/base.css`: الأساس المشترك لكل لوحات التحكم.
- `styles/dashboard/shared.css`: أجزاء مشتركة بين الداشبوردات.
- `styles/dashboard/engineer.css`: Dashboard مهندس الرسم.
- `styles/dashboard/engineering-roles.css`: إضافات Full Engineer وProduction Engineer والمشرفين.
- `styles/dashboard/marketer.css`: Dashboard المندوب.
- `styles/dashboard/marketing-manager.css`: Dashboard مدير التسويق.
- `styles/dashboard/owner-manager.css`: Dashboard المالك.
- `styles/dashboard/production-manager.css`: Dashboard مدير/مهندس الإنتاج.
- `styles/dashboardLayout/layout.css`: هيكل الـDashboard العام.
- `styles/dashboardLayout/sidebar.css`: القائمة الجانبية.
- `styles/dashboardLayout/topbar.css`: الشريط العلوي والجرس.
- `styles/dashboardLayout/account-switcher.css`: قائمة تبديل الحسابات.
- `styles/dashboardLayout/user-info.css`: اسم وصورة المستخدم في الأعلى.
- `styles/dashboardLayout/responsive.css`: نسخة الموبايل والقائمة السفلية.
- `styles/projectEditor/editor.css`: الحقول والمرفقات وزر التحديث ومحرر المشروع العام.
- `styles/projectEditor/execution-workspace.css`: مساحة PDF التنفيذ.
- `styles/projectEditor/production-tracking.css`: مراحل الإنتاج وسجل التحديثات.
- `styles/projects/execution-builder.css`: مظهر إنشاء PDF التنفيذ.
- `styles/projects/filters-and-index.css`: فلاتر وفهرس اللوحات.
- `styles/projects/folder.css`: داخل المشروع.
- `styles/projects/list.css`: قائمة/شبكة المشاريع.
- `styles/projects/states-and-dialogs.css`: حالات البطاقات والنوافذ.

---

# Backend — `D:\Starco V3\backend`

## تشغيل وإعداد النشر

- `index.js`: يشغّل Express، يتصل بـMongoDB، يسجل الـrouters والـmiddlewares.
- `vercel.json`: الجداول اليومية على Vercel؛ منها تذكيرات الإنتاج والتنظيف السنوي.
- `.env`: أسرار التشغيل محليًا؛ لا يرفع إلى Git ولا يشارك.
- `.env.example`: أسماء متغيرات البيئة المطلوبة بدون أسرار.
- `package.json`: مكتبات وأوامر الباك إند.

## Controllers — منطق الـAPI

- `controllers/projectsV2.js`: إنشاء/تعديل/حذف المشاريع، المرفقات، معاينة العميل، رفع R2 المباشر، روابط تنزيل R2، وسلة المحذوفات.
- `controllers/panels.js`: كل منطق اللوحات: التسعير، PDF التنفيذ، ملفات التصنيع، مراحل الإنتاج، المواعيد، والتنزيل.
- `controllers/clients.js`: CRUD للعملاء.
- `controllers/dashboard.js`: بيانات الـDashboard واللقطات الإحصائية.
- `controllers/notifications.js`: عرض الإشعارات وقراءتها واشتراك Push.
- `controllers/systemConfiguration.js`: قراءة/تعديل إعدادات الأسعار والنحاس والأنواع.
- `controllers/whatsapp.js`: Webhook واتساب، الرسائل، رفع المرفقات إلى R2، وأوامر مراحل الإنتاج.
- `controllers/productionWorkflow.js`: endpoint الجدول اليومي؛ يرسل تذكيرات الإنتاج ويشغّل حذف المشاريع المنتهية بعد سنة.
- `controllers/users/auth.controller.js`: تسجيل الدخول والتسجيل والتوكن.
- `controllers/users/approval.controller.js`: اعتماد الحسابات المعلقة.
- `controllers/users/manager.controller.js`: إدارة مستخدم/رول/حذف واستعادة.
- `controllers/users/profile.controller.js`: الملف الشخصي وكلمة المرور.
- `controllers/users/linkedAccounts.controller.js`: الحسابات المرتبطة والتبديل.
- `controllers/users/dashboardNotes.controller.js`: ملاحظات الداشبورد الخاصة بالمستخدم.

## Routers — عناوين الـAPI

- `routers/projects.js`: عناوين `/projects` ومرفقاتها وروابط معاينة العميل.
- `routers/panels.js`: عناوين اللوحة داخل المشروع.
- `routers/panelsRoot.js`: عناوين فهرس كل اللوحات.
- `routers/clients.js`: عناوين العملاء.
- `routers/users.js`: عناوين الحسابات والموافقات والملف الشخصي.
- `routers/dashboard.js`: عناوين الـDashboard والإحصاءات.
- `routers/notifications.js`: عناوين الجرس وPush.
- `routers/systemConfiguration.js`: عناوين الإعدادات.
- `routers/whatsapp.js`: Webhook واتساب وعملية التحقق.
- `routers/productionWorkflow.js`: عناوين الجدول اليومي المحمية بـ`CRON_SECRET`.

## Services — عمليات خلفية مشتركة

- `services/r2Storage.js`: الاتصال بـCloudflare R2، توليد روابط الرفع/التنزيل الموقعة، التحقق، والحذف.
- `services/projectRetention.js`: حذف المشروع بعد 365 يومًا مع لوحاته وملفاته R2 وإشعاراته ورسائل واتساب المرتبطة.
- `services/productionWorkflowReminders.js`: حساب وإرسال تذكيرات ومتابعات مراحل الإنتاج.
- `services/projectWhatsappNotifications.js`: قوالب ورسائل واتساب الخاصة بالمشاريع والمراحل.
- `services/whatsappMeta.js`: الاتصال بـMeta WhatsApp Cloud API.
- `services/whatsappParser.js`: قراءة وتحويل محتوى رسائل واتساب الواردة إلى بيانات مفهومة.
- `services/internalNotifications.js`: إنشاء إشعارات الجرس وإرسال Push عند توفره.
- `services/dashboardStatistics.js`: جمع وحفظ إحصاءات Dashboard اليومية.
- `services/syncClient.js`: مزامنة/تنظيف بيانات العملاء عند الحاجة.

## Models — دوال التعامل مع MongoDB

- `models/projects.js`: قراءة وإنشاء وتعديل وحذف مشاريع MongoDB.
- `models/panels.js`: التعامل مع اللوحات.
- `models/clients.js`: التعامل مع العملاء.
- `models/users.js`: التعامل مع المستخدمين.
- `models/notifications.js`: قراءة/إنشاء/تأشير إشعارات الجرس.
- `models/pushSubscriptions.js`: اشتراكات إشعارات الجهاز.
- `models/systemConfiguration.js`: إعدادات النظام.
- `models/counters.js`: عدادات أكواد المشاريع واللوحات.
- `models/dashboardStatistics.js`: لقطات الإحصاءات.
- `models/whatsappMessages.js`: رسائل واتساب والمرفقات المرتبطة بها.
- `models/whatsappSessions.js`: جلسات/حالات محادثة واتساب المؤقتة.

## Schemas — شكل البيانات في MongoDB

- `DB/schema/projects.js`: حقول المشروع والعميل والحالة ورابط المعاينة وسلة المحذوفات.
- `DB/schema/panels.js`: حقول اللوحة، التسعير، المرفقات، PDF التنفيذ، التصنيع، المراحل والمواعيد.
- `DB/schema/clients.js`: حقول العميل.
- `DB/schema/users.js`: الحساب والرول والموافقة والحذف.
- `DB/schema/notifications.js`: إشعارات الجرس.
- `DB/schema/pushSubscriptions.js`: بيانات اشتراك Push.
- `DB/schema/systemConfiguration.js`: الأسعار والنحاس وأنواع اللوحات والإعدادات.
- `DB/schema/counters.js`: آخر رقم مستخدم في الأكواد.
- `DB/schema/dashboardStatistics.js`: إحصاءات الأيام السابقة.
- `DB/schema/whatsappMessages.js`: رسالة واتساب وملفها في R2.
- `DB/schema/whatsappSessions.js`: جلسة واتساب ذات تاريخ انتهاء TTL.
- `DB/config.js`: فتح اتصال/Model MongoDB بالطريقة الموحدة.
- `DB/ensureUserIndexes.js`: إنشاء/إصلاح الفهارس المهمة للمستخدمين عند تشغيل السيرفر.

## Middlewares

- `midelwers/auth.js`: يقرأ JWT ويتأكد أن الطلب مسجل دخول.
- `midelwers/Users/CheckUserToken.js`: يتحقق أن الحساب صالح ومعتمد وغير محذوف.
- `midelwers/Handeling error.js`: يحول أخطاء السيرفر إلى رد مفهوم للواجهة.

---

## قاعدة آمنة قبل تعديل أي شيء

1. تعديل شاشة = ابدأ من `pages` ثم component المرتبط ثم CSS.
2. تعديل زر أو طلب بيانات = راجع component ثم الملف المناسب في `services`.
3. تعديل صلاحية = راجع `utils/roles.js` في الواجهة **و** controller الذي ينفذ العملية في الباك إند.
4. تعديل معلومة محفوظة = راجع `DB/schema` قبل controller.
5. تعديل R2 = ابدأ من `backend/services/r2Storage.js`؛ لا تضع مفاتيح Cloudflare داخل الواجهة.
6. بعد أي تعديل شغّل: `npm run lint` ثم `npm run build` في مجلد frontend، وراجع صياغة ملف backend الذي عدلته.
