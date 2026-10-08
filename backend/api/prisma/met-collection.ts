/**
 * Sixteen sourced Vietnamese works in The Met Open Access collection.
 * The Vietnamese text is original demonstration narration, not the museum's
 * curatorial copy. Each image source is listed under "Demo content" in the
 * README. Translation and speech are generated later by
 * the AI service; this seed never invents those outputs.
 */
import { ExhibitStatus } from '@prisma/client';
import type { ExhibitSeed } from './demo-content';

function metExhibit(
  objectId: number,
  title: string,
  shortDescription: string,
  description: string,
): ExhibitSeed {
  return {
    code: `EX_MET_${objectId}`,
    defaultTitle: title,
    status: ExhibitStatus.PUBLISHED,
    asset: `met-${objectId}.jpg`,
    mediaCaption: `${title}. The Metropolitan Museum of Art, object ${objectId} (Public Domain / Open Access).`,
    translations: [{ languageCode: 'vi', title, shortDescription, description }],
  };
}

export const metExhibits: ExhibitSeed[] = [
  metExhibit(
    37449,
    'Hũ gốm có chân đế',
    'Hũ sành Việt Nam thế kỷ XI–XII, cao khoảng 25,5 cm.',
    `Chiếc hũ này được The Metropolitan Museum of Art xếp vào đồ sành Việt Nam thế kỷ XI–XII. Thân hũ đứng trên một chân đế, bên trên là nắp. Hãy nhìn hình dáng tổng thể trước khi chú ý các nét trang trí sẫm màu ở thân: một vật dụng có thể được nhận ra chỉ bằng đường viền, nhưng vẫn mời ta lại gần để xem bề mặt.

Đồ gốm luôn được tạo nên qua nhiều bước: chọn đất, tạo hình, xử lý bề mặt rồi nung. Ở chiếc hũ này, dáng đứng vững và sự tương phản giữa nền men sáng với họa tiết tối là hai điểm dễ nhận thấy. Hồ sơ của The Met ghi chiều cao hiện vật là 25,5 cm; đó là một kích thước gần gũi với cơ thể người, khác với cảm giác khi chỉ nhìn ảnh.

Bảo tàng không công bố công dụng cụ thể của riêng chiếc hũ trong hồ sơ trực tuyến. Vì thế, thay vì gán cho nó một câu chuyện sử dụng chưa được chứng thực, hãy quan sát cách người thợ kết hợp phần chứa, nắp và chân đế thành một hình khối hoàn chỉnh.`,
  ),
  metExhibit(
    37450,
    'Bình gốm trang trí sóng và biểu tượng cát tường',
    'Bình sành men lam Việt Nam thế kỷ XIV, cao 27,9 cm.',
    `Đây là một chiếc bình gốm Việt Nam thế kỷ XIV, được vẽ bằng màu lam cobalt dưới lớp men trong. Cổ bình thon dài, thân phình ra rồi thu lại ở chân. Các đường lam uốn quanh thân tạo thành nhịp điệu của sóng và những hình trang trí mang ý nghĩa tốt lành. Hãy thử đi theo đường cong của bình bằng mắt: từ miệng, qua cổ, xuống phần thân rộng nhất.

The Metropolitan Museum of Art cho biết lịch sử của kiểu dáng này đi qua nhiều chất liệu và khu vực: hình thức từng xuất hiện trong đồ kim loại, rồi được diễn giải lại ở Trung Quốc trước khi có mặt trên bình gốm Việt Nam. Điều đó không làm hiện vật trở thành bản sao đơn giản. Sự lựa chọn tỷ lệ, chất liệu sành và cách đặt nét lam đã tạo nên một vật thể cụ thể với đời sống riêng.

Hồ sơ trực tuyến không xác định người làm hoặc nơi sử dụng chiếc bình. Điều chắc chắn hơn là những gì còn lại trên bề mặt: men, nét vẽ và hình dáng cùng cho thấy người thợ đã biến một mẫu hình được lưu chuyển thành một sản phẩm gốm có thể cầm, đặt và nhìn từ nhiều phía.`,
  ),
  metExhibit(
    37451,
    'Đĩa gốm hoa mẫu đơn',
    'Đĩa sành men lam Việt Nam thế kỷ XV, đường kính 44,5 cm.',
    `Lòng chiếc đĩa lớn này được phủ kín bằng hoa mẫu đơn và những dải hoa văn màu lam. The Metropolitan Museum of Art định niên đại tác phẩm vào thế kỷ XV và ghi đường kính tới 44,5 cm. Khi đứng trước một vật thể rộng như vậy, mắt ta có thể bắt đầu ở cụm hoa giữa lòng đĩa rồi lần ra các vòng trang trí chạy quanh mép.

Màu lam cobalt nằm dưới lớp men trong, vì thế họa tiết và bề mặt gốm gắn với nhau sau khi nung. The Met nhận thấy cách vẽ mẫu đơn cho thấy nghệ nhân biết đến các truyền thống gốm Trung Quốc trước đó. Đồng thời, đồ gốm Việt Nam cùng thời cũng tham gia những mạng lưới trao đổi trong khu vực Đông Nam Á. Chiếc đĩa vì thế gợi một câu chuyện về kỹ thuật, thị hiếu và sự lưu chuyển của hình ảnh.

Ta chưa thể suy ra chủ nhân hoặc bữa tiệc nào từ riêng bức ảnh. Hãy nhìn lại những cánh hoa, lá và khoảng trống giữa chúng: chính sự sắp xếp ấy làm cho một đồ vật có chức năng sử dụng trở thành một bề mặt để thưởng thức.`,
  ),
  metExhibit(
    37558,
    'Bình rót hình chim phượng',
    'Bình rót gốm men lam Việt Nam khoảng thế kỷ XV–XVI.',
    `Chiếc bình rót này mang hình một con chim phượng. Đầu chim vươn cao, mào được nhấn mạnh; thân, cánh và phần tay cầm hòa thành một hình dáng vừa có thể dùng để rót, vừa có thể ngắm như một tác phẩm tạo hình. Những nét lam dưới men đánh dấu lông và các mảng trang trí trên thân.

The Metropolitan Museum of Art xếp bình vào đồ gốm Việt Nam khoảng thế kỷ XV–XVI. Bảo tàng cho biết những vật dụng tạo hình chim, thú hoặc người là một phần của sản xuất gốm Việt Nam thời kỳ này, phục vụ cả nhu cầu trong nước lẫn thị trường ngoài nước. Những chiếc bình tương tự đã được tìm thấy ở Indonesia, cho thấy đồ gốm có thể đi rất xa khỏi nơi ra lò.

Hãy quan sát sự khéo léo trong việc nối các bộ phận: mỏ, cổ, cánh, thân và tay cầm phải cùng hoạt động trong một đồ chứa. Mục đích sử dụng cụ thể của riêng chiếc bình không được hồ sơ công khai xác nhận, nhưng hình thức của nó đã kể nhiều điều về trí tưởng tượng của người làm.`,
  ),
  metExhibit(
    37559,
    'Bát lớn trang trí đôi chim',
    'Bát gốm Việt Nam thế kỷ XV–XVI với men màu đỏ, xanh và vàng.',
    `Trên lòng chiếc bát rộng là một bố cục nhiều màu với đôi chim và hoa lá. Hồ sơ của The Metropolitan Museum of Art ghi đây là đồ gốm Việt Nam thế kỷ XV–XVI, dùng các màu đỏ, xanh lá và vàng vẽ trên men. Đường kính 36,8 cm khiến bề mặt bên trong giống một khoảng tranh tròn: hình ở tâm được bao quanh bằng các vòng trang trí liên tiếp.

Khác với đồ gốm chỉ dùng lam dưới men, chiếc bát này cho thấy một lựa chọn màu sắc phong phú hơn. Hãy nhìn cách những nét vẽ ở giữa dẫn mắt ra mép và cách mép bát khép lại toàn bộ hình ảnh. Khi vật được đặt trên bàn hoặc cầm nghiêng, người xem sẽ gặp bức tranh ấy ở những góc khác nhau.

Tên hiện vật trong hồ sơ nhắc tới đôi chim, nhưng không tự nó xác nhận chiếc bát từng dùng trong dịp nào. Câu hỏi nên giữ lại là: tại sao người thợ dành nhiều công sức cho phần lòng bát, nơi vừa có thể chứa đồ vừa có thể mở ra một thế giới hình ảnh?`,
  ),
  metExhibit(
    37664,
    'Bát men lục dáng hoa sen',
    'Bát gốm nung nhiệt cao, men xanh lục, Việt Nam thế kỷ XIV.',
    `Chiếc bát thế kỷ XIV này được The Metropolitan Museum of Art mô tả là gốm nung nhiệt cao phủ men xanh lục. Thành bát mở lên từ chân nhỏ, bề mặt có những đường dọc gợi nhịp cánh hoa sen. Màu men không phô trương hoa văn dày đặc; ánh sáng trên phần cong mới là thứ làm hình dáng thay đổi khi ta bước quanh.

Một chiếc bát có thể trông rất giản dị trên màn hình. Khi biết chiều cao của nó khoảng 10,9 cm, ta dễ hình dung kích thước của vật trong tay hơn. Đất, nhiệt nung và lớp men cùng quyết định bề mặt cuối cùng; chỉ một thay đổi nhỏ trong độ dày men cũng có thể khiến sắc xanh đậm nhạt khác nhau.

Hồ sơ công khai chưa nêu chủ nhân hay hoàn cảnh sử dụng cụ thể. Hãy dành thời gian nhìn mép bát, thân bát và chân bát như ba phần của một chuyển động liền mạch: đó là nơi kỹ thuật làm gốm thể hiện qua một hình thức gần gũi hằng ngày.`,
  ),
  metExhibit(
    37428,
    'Pháp khí kim cương chử bằng đồng',
    'Hiện vật đồng được ghi là vajra, Việt Nam thế kỷ XII.',
    `Vật bằng đồng nhỏ này được The Metropolitan Museum of Art ghi tên là vajra và định niên đại vào thế kỷ XII. Hai đầu đối xứng tỏa ra từ phần giữa có thể cầm bằng tay. Trong ảnh, đường nét của nó gợi một vật dùng trong nghi thức hơn là một công cụ sinh hoạt thông thường; tuy vậy, hồ sơ trực tuyến không ghi hoàn cảnh sử dụng của chính hiện vật này.

Tên gọi vajra thường được dịch là kim cương chử trong ngữ cảnh Phật giáo. Khi nhìn kỹ, ta thấy người đúc không chỉ chú ý đến biểu tượng ở hai đầu mà còn tạo một trục cân bằng để toàn bộ vật có thể được xoay và quan sát từ nhiều phía. Bề rộng 15,2 cm cho thấy đây là đồ vật nhỏ, trong khi các chi tiết kim loại vẫn được xử lý cẩn thận.

Hiện vật nhắc chúng ta rằng thế giới của một bảo tàng không chỉ gồm tượng lớn hay kiến trúc. Một pháp khí cầm tay cũng có thể mang theo truyền thống tạo hình và thực hành tôn giáo; để kể lịch sử riêng của nó sâu hơn, cần thêm tư liệu về nơi phát hiện và quá trình sử dụng.`,
  ),
  metExhibit(
    37759,
    'Rìu đồng Đông Sơn hình bàn chân',
    'Rìu đồng Đông Sơn với hình thuyền, động vật và người cách điệu.',
    `Mặt rộng của chiếc rìu đồng này mang những đường khắc nhỏ. The Metropolitan Museum of Art đặt nó trong văn hóa Đông Sơn, khoảng từ 500 trước Công nguyên đến 300 sau Công nguyên, và mô tả các hình động vật, thuyền cùng một nhân vật đội lông vũ. Khi nhìn ảnh, hãy lần theo dải hoa văn trên thân rìu trước khi tìm từng hình riêng lẻ.

Chiều cao được bảo tàng ghi là khoảng 13 cm. Một kích thước không lớn, nhưng bề mặt đồng vẫn trở thành nơi chứa nhiều chi tiết. Hình dáng rìu gợi chức năng của một dụng cụ; phần trang trí khiến ta cũng phải đặt câu hỏi về giá trị biểu tượng của nó. Chỉ từ hồ sơ trực tuyến, ta chưa thể khẳng định chiếc rìu này từng được dùng trong lao động, nghi lễ hay được cất giữ theo cách nào.

Điều có thể quan sát chắc chắn là sự kết hợp giữa đúc đồng và tạo hình. Người thợ đã dành một mặt của vật để ghi lại những hình ảnh có nhịp điệu, cho phép người xem hôm nay tiếp cận một phần thế giới thị giác Đông Sơn.`,
  ),
  metExhibit(
    37760,
    'Tấm đồng Đông Sơn có chuông nhỏ',
    'Tấm đồng Đông Sơn trang trí nhân vật cách điệu và các chuông treo.',
    `Tấm đồng này khác hẳn chiếc trống hay chiếc rìu quen thuộc. Một mặt phẳng gần vuông mang các dải họa tiết hình học; ở phía dưới là những chuông nhỏ treo thành cặp. The Metropolitan Museum of Art ghi nó thuộc văn hóa Đông Sơn, khoảng 500 trước Công nguyên đến 300 sau Công nguyên, và đặt tên theo hình nhân cách điệu ở tư thế chèo thuyền.

Hãy quan sát từng tầng: họa tiết chạy ở mép, hình ở giữa và các bộ phận treo phía dưới. Nếu chuông từng chuyển động, âm thanh có thể đã góp phần vào trải nghiệm với vật, nhưng hồ sơ công khai không xác định cách dùng cụ thể của chính tấm đồng này. Vì vậy, âm thanh ấy nên được xem là một khả năng để suy nghĩ, không phải một lời khẳng định.

Chỉ cao khoảng 10 cm, hiện vật vẫn cho thấy khả năng tổ chức một bố cục phức tạp trên diện tích nhỏ. Những đường nét và bộ phận gắn thêm mở ra câu hỏi về mối quan hệ giữa hình ảnh, chuyển động và chất liệu đồng.`,
  ),
  metExhibit(
    37766,
    'Mặt trống đồng Đông Sơn',
    'Mặt trống đồng Đông Sơn đường kính khoảng 70,5 cm.',
    `Đây là một mặt trống đồng, không phải toàn bộ thân trống. Từ tâm, các vòng hoa văn lan dần ra mép trên một bề mặt tròn đường kính khoảng 70,5 cm. The Metropolitan Museum of Art xếp hiện vật vào văn hóa Đông Sơn, khoảng 500 trước Công nguyên đến 300 sau Công nguyên, và gọi đây là mặt của một trống loại Heger I.

Hãy nhìn sự thay đổi theo khoảng cách. Khi đứng xa, tâm trống và những vòng tròn là điều nổi bật. Khi lại gần, từng dải trang trí nhỏ mới hiện rõ. Dù phần thân không còn trong ảnh, hình thức mặt trống cho phép ta hình dung vị trí nơi một nhạc cụ có thể được đánh. Không nên gán một dịp diễn xướng cụ thể cho hiện vật khi hồ sơ trực tuyến không ghi điều đó.

Mặt trống vừa là một cấu trúc bằng kim loại, vừa là một bề mặt tạo hình. Những vết thời gian trên đồng nhắc rằng thứ ta thấy hôm nay đã trải qua một lịch sử dài trước khi trở thành hiện vật bảo tàng.`,
  ),
  metExhibit(
    39209,
    'Trống đồng nhỏ có bốn con ếch',
    'Trống đồng Đông Sơn kích thước nhỏ, cao khoảng 10,2 cm.',
    `Chiếc trống đồng nhỏ này chỉ cao khoảng 10,2 cm, nhưng vẫn có đủ mặt trống và thân trống. The Metropolitan Museum of Art ghi bốn hình ếch trên mặt, đặt hiện vật trong văn hóa Đông Sơn, khoảng 500 trước Công nguyên đến 300 sau Công nguyên. Trong ảnh, hãy tìm các con ếch ở gần mép rồi nhìn về hình trang trí ở tâm.

Kích thước thu nhỏ làm hiện vật đặc biệt thú vị khi so với những trống đồng lớn. Các bộ phận quen thuộc được nén vào một hình thể có thể đặt gọn trước mắt, còn các đường hoa văn vẫn được giữ lại. Hồ sơ trực tuyến chưa giải thích vì sao chiếc trống này được làm nhỏ hoặc nó từng được dùng ra sao; ta không nên suy ra một mục đích nghi lễ hay đồ chơi từ kích thước đơn thuần.

Đặt cạnh các hiện vật Đông Sơn khác, chiếc trống cho thấy một truyền thống tạo hình có thể xuất hiện ở nhiều quy mô. Bốn con ếch và những vòng trang trí khiến người xem vừa nhận ra loại đồ vật, vừa chú ý đến lựa chọn riêng của người thợ.`,
  ),
  metExhibit(
    38157,
    'Tượng Phật ngồi bằng sa thạch',
    'Tượng Phật ngồi, Việt Nam thế kỷ VII–VIII, chất liệu sa thạch.',
    `Tượng Phật ngồi trước mắt bạn được tạc bằng sa thạch. The Metropolitan Museum of Art ghi niên đại thế kỷ VII–VIII và xếp vào giai đoạn tiền Angkor. Gương mặt yên tĩnh, hai tay đặt gần nhau phía trước thân; phần bệ phía dưới giữ cho dáng ngồi cân bằng. Hãy nhìn cách đường vai và đầu gối dẫn mắt về trung tâm của hình tượng.

Chiều cao tác phẩm khoảng 40,3 cm. Đó là một kích thước vừa phải, đủ để người thợ làm rõ gương mặt, nếp thân và tư thế mà không dựa vào quy mô đồ sộ. Chất sa thạch cho phép tạc khối mềm, nhưng cũng giữ lại dấu vết mòn và sứt theo thời gian. Những dấu ấy là một phần tình trạng hiện nay của tác phẩm, không tự nói lên nơi đặt tượng ban đầu.

Hồ sơ trực tuyến không xác định công trình hay địa điểm phát hiện riêng của pho tượng. Điều ta có thể làm là quan sát trực tiếp mối quan hệ giữa chất đá, tư thế ngồi và cảm giác tĩnh tại mà hình khối tạo ra.`,
  ),
  metExhibit(
    38293,
    'Tượng Yaksha, có thể là Kubera',
    'Tượng bán thân sa thạch, Việt Nam cuối thế kỷ VI – đầu thế kỷ VII.',
    `The Metropolitan Museum of Art đặt tên hiện vật là Yaksha, có thể là Kubera. Chữ “có thể” rất quan trọng: danh tính nhân vật chưa được khẳng định chắc chắn. Đây là tượng bán thân bằng sa thạch, được định niên đại vào cuối thế kỷ VI đến đầu thế kỷ VII và xếp trong giai đoạn tiền Angkor.

Trên phần tượng còn lại, gương mặt, trang sức và các đường nét quanh vai vẫn hiện rõ. Hai cánh tay không còn nguyên vẹn, nên tư thế ban đầu chỉ có thể được suy đoán thận trọng. Hãy nhìn phần còn lại như một khối điêu khắc có lịch sử riêng: những chỗ mòn hoặc mất đi cũng cho biết tác phẩm đã tồn tại qua nhiều thế kỷ.

Tên gọi trong hồ sơ là một cách nhận diện dựa trên nghiên cứu hiện có, không phải lời kể chắc chắn về mọi chi tiết. Bức tượng gợi cho ta câu hỏi về hình tượng thần linh và cách chúng được thể hiện trong khu vực, đồng thời nhắc rằng một bảo tàng tốt luôn để chỗ cho những điều chưa biết.`,
  ),
  metExhibit(
    38617,
    'Tượng Hari-Hara đứng',
    'Tượng đá cao khoảng 94 cm, Việt Nam nửa đầu thế kỷ VIII.',
    `Pho tượng đá này đứng thẳng, cao khoảng 94 cm. The Metropolitan Museum of Art gọi nhân vật là Hari-Hara và định niên đại vào nửa đầu thế kỷ VIII, thuộc giai đoạn tiền Angkor. Hãy bắt đầu ở gương mặt rồi quan sát trục cơ thể: các chi tiết trên đầu, ngực và hai bên thân tạo ra một dáng đứng trang nghiêm.

Hari-Hara là tên gọi của hình tượng kết hợp những yếu tố gắn với Vishnu và Shiva trong truyền thống Ấn Độ giáo. Ở pho tượng này, một phần chi tiết không còn nguyên, vì vậy việc đọc từng dấu hiệu cần dựa vào nghiên cứu chuyên môn hơn là chỉ một bức ảnh. Điều có thể thấy rõ là người thợ đã tổ chức thân hình theo chiều thẳng đứng và tạo các điểm nhấn ở phần đầu cùng tay.

Hồ sơ trực tuyến ghi văn hóa Việt Nam nhưng không cho biết nơi đặt nguyên gốc của tượng. Khi thiếu bối cảnh ấy, việc quan sát hình thể và đọc đúng mức độ chắc chắn của tên gọi là cách tiếp cận cẩn trọng nhất.`,
  ),
  metExhibit(
    39215,
    'Tượng Phật ngồi buông chân',
    'Tượng đá Việt Nam thế kỷ VII, cao khoảng 22,9 cm.',
    `Pho tượng đá nhỏ này được The Metropolitan Museum of Art đặt tên là “Seated Buddha with Legs Pendant” và định niên đại vào thế kỷ VII. Nhân vật ngồi với hai chân buông xuống, khác dáng ngồi xếp bằng thường gặp ở nhiều tượng Phật. Hãy quan sát đường vai, vị trí hai bàn tay và cách phần chân nối với bệ tượng.

Tác phẩm cao khoảng 22,9 cm. Ở quy mô ấy, người thợ phải chọn những dấu hiệu quan trọng nhất để người xem nhận ra tư thế và thần thái. Bề mặt đá đã mòn theo thời gian, nhưng dáng ngồi vẫn là điểm tựa rõ ràng để đọc hình tượng. Ta có thể so sánh nó với pho tượng Phật ngồi lớn hơn trong cùng kho mẫu để thấy một chủ đề được thể hiện bằng nhiều lựa chọn hình khối.

Hồ sơ công khai không ghi địa điểm đặt tượng đầu tiên hoặc cách tượng được thờ phụng. Việc giữ những khoảng trống ấy trong câu chuyện giúp ta tôn trọng bằng chứng hiện có, đồng thời dành chỗ cho quan sát của chính mình.`,
  ),
  metExhibit(
    51170,
    'Tượng Bồ tát Quán Thế Âm đứng',
    'Tượng đồng mạ vàng, Việt Nam khoảng thế kỷ VII.',
    `Hình tượng đứng này được The Metropolitan Museum of Art nhận diện là Avalokiteshvara, vị Bồ tát gắn với lòng từ bi, và định niên đại khoảng thế kỷ VII. Tác phẩm bằng đồng mạ vàng, cao khoảng 36,5 cm. Trong ảnh, hãy nhìn dáng đứng cân bằng, trang sức và những đường nét nhỏ trên y phục; bề mặt kim loại đã đổi màu theo thời gian nhưng vẫn giữ nhiều chi tiết.

Chất liệu đồng cho phép tạo một hình tượng vừa bền vừa có các phần nhô mảnh. Lớp mạ vàng vốn làm ánh sáng thay đổi khi người xem bước quanh tượng. Tình trạng còn lại hôm nay cho thấy hiện vật đã trải qua một lịch sử dài; ta không thể từ ảnh mà biết chính xác ánh sáng hay không gian nơi tượng từng được đặt.

Hồ sơ ghi văn hóa Việt Nam nhưng không xác định địa điểm thờ tự nguyên gốc. Vì vậy, bài đọc này tập trung vào những gì hiện vật và dữ liệu bảo tàng cho phép nói: tên gọi, niên đại ước tính, chất liệu và cách hình tượng được tạo nên.`,
  ),
];
