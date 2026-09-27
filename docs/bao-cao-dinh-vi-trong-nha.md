# Định vị trong nhà bằng BLE Fingerprinting và WKNN

> Bản nháp chương báo cáo. Các ô `…` trong phần Kết quả điền từ
> `research/results/<thời điểm>/report.md` sau khi thu dữ liệu thật.

## 1. Bài toán

Ứng dụng cần làm hai việc từ cùng một nguồn tín hiệu BLE:

1. **Biết khách đang ở khu trưng bày nào** để tự động thuyết minh và gửi thông báo "Bạn đang ở gần …".
2. **Hiển thị vị trí (x, y) của khách trên bản đồ** của phòng.

Hai việc này đòi hỏi độ tin cậy khác nhau. Thuyết minh sai khu gây khó chịu, nên cần một quyết định ổn định. Chấm trên bản đồ lệch khoảng 1 m vẫn chấp nhận được. Vì vậy hệ thống dùng **hai thuật toán chạy song song trên cùng luồng RSSI**:

| Thuật toán | Đầu ra | Dùng cho |
|---|---|---|
| Nhận diện zone (beacon mạnh nhất + ngưỡng `minRssi` + dwell + hysteresis) | Zone đã xác nhận | Thuyết minh, thông báo |
| BLE fingerprinting + WKNN | Toạ độ (x, y) theo mét | Marker trên bản đồ |

Toàn bộ tính toán chạy trên điện thoại; server chỉ lưu dữ liệu hạ tầng (bản đồ, fingerprint calibration), không nhận vị trí của khách.

## 2. Tiền xử lý tín hiệu

RSSI thô dao động mạnh do phản xạ, người che chắn và nhiễu. Với mỗi beacon, điện thoại giữ một **cửa sổ trượt** (3 s cho định vị, 4 s cho nhận diện zone), rồi:

1. **Loại outlier:** bỏ mẫu lệch hơn 12 dB so với trung vị của cửa sổ.
2. **Làm mượt:** trung bình có trọng số tăng dần theo thời gian (mẫu mới nặng hơn).
3. Beacon không nghe thấy trong cửa sổ bị loại khỏi danh sách.

Trên Android, quét BLE ở chế độ `LowLatency`. Chế độ mặc định `LowPower` chỉ quét khoảng 0,5 s trong mỗi 5 s, không đủ mẫu cho cửa sổ 3–4 s.

## 3. Fingerprinting

### 3.1 Pha offline: thu radio map

- Phòng được chia lưới **điểm tham chiếu** (reference point) cách nhau 1 m, cách tường 0,5 m. Phòng 5 × 5 m cho 25 điểm (A1…E5).
- Tại mỗi điểm, nhân viên đứng yên và thu RSSI thô trong 10 s, lặp lại theo 4 hướng cầm máy (0°, 90°, 180°, 270°) để giảm ảnh hưởng của cơ thể che sóng.
- **Fingerprint** của một lần thu được tính bằng cách *phát lại* các mẫu thô qua đúng bộ tiền xử lý ở mục 2 (đồng hồ ảo, nhịp 500 ms), rồi lấy trung bình vector qua các nhịp. Nhờ đó fingerprint cùng bản chất với vector mà điện thoại thấy khi định vị trực tiếp.
- Vector có **thứ tự beacon cố định**. Beacon không nghe thấy được điền **−100 dBm** thay vì bỏ trống, vì [−61, −72, −100] và [−61, −72] không so sánh được.
- **Radio map** là vector trung bình của mọi lần thu tại mỗi điểm.
- Mỗi dòng máy có radio map riêng, vì RSSI giữa các điện thoại lệch nhau vài dB. App ưu tiên dữ liệu thu cùng dòng máy, sau đó cùng hệ điều hành.

### 3.2 Pha online: WKNN

Mỗi 500 ms, với vector RSSI hiện tại **R** và fingerprint **Fᵢ** của điểm tham chiếu i tại (xᵢ, yᵢ):

$$d_i = \sqrt{\sum_j (R_j - F_{ij})^2}$$

Lấy k điểm có dᵢ nhỏ nhất, với trọng số

$$w_i = \frac{1}{d_i + \varepsilon}$$

Toạ độ ước lượng là trung bình có trọng số:

$$x = \frac{\sum w_i x_i}{\sum w_i}, \qquad y = \frac{\sum w_i y_i}{\sum w_i}$$

Sau đó toạ độ được làm mượt bằng trung bình trượt hàm mũ (α = 0,35) để marker không giật. Bán kính vòng sai số vẽ quanh marker là khoảng cách trung bình có trọng số từ các láng giềng tới điểm ước lượng. Nếu nghe được ít hơn 2 beacon, hệ thống không đưa ra ước lượng ("tín hiệu yếu").

**Ví dụ tính tay** (đã kiểm chứng bằng unit test `wknn.spec.ts`). Vector hiện tại R = [−60, −68, −79, −87]:

| Điểm | (x, y) | Fingerprint | dᵢ |
|---|---|---|---|
| P1 | (1, 1) | [−52, −76, −81, −90] | 11,87 |
| P2 | (2, 1) | [−58, −70, −80, −86] | **3,16** |
| P3 | (3, 1) | [−65, −62, −82, −84] | **8,89** |
| P6 | (2, 2) | [−60, −68, −79, −79] | **8,00** |

Với k = 3, ba điểm gần nhất là P2, P6, P3. Trọng số chuẩn hoá lần lượt khoảng 0,57; 0,23; 0,20, cho kết quả **(x, y) ≈ (2,20; 1,23)**.

## 4. Nhận diện zone và ngưỡng minRssi

Một zone chỉ được xác nhận khi beacon của nó:

- mạnh nhất, và
- vượt ngưỡng `minRssi` riêng của beacon đó, và
- giữ vị trí mạnh nhất liên tục ≥ 3 s (dwell), và
- mạnh hơn beacon của zone hiện tại ≥ 4 dB (hysteresis).

Mỗi zone chỉ thông báo lại sau 60 s (cooldown).

`minRssi` được **gợi ý từ chính dữ liệu calibration**. Với mỗi beacon, hệ thống hồi quy bình phương tối thiểu mô hình suy hao log-khoảng cách trên các điểm tham chiếu:

$$\text{RSSI}(d) = P_0 - 10\,n\,\log_{10} d$$

Từ đó suy ra RSSI tại bán kính kích hoạt mong muốn (ví dụ 1,5 m) và dùng làm `minRssi`. Hai tham số P₀ và n ước lượng được cũng là số liệu mô tả môi trường phòng thí nghiệm.

## 5. Thiết kế thực nghiệm

- **Môi trường:** phòng khoảng 5 × 5 m, 3 beacon Minew i3 ở 3 góc, cùng độ cao khoảng 1–1,2 m, Tx −8 dBm, chu kỳ phát 100–200 ms.
- **Thiết bị:** 1 iPhone, 1 điện thoại Android.
- **Dữ liệu:** 25 điểm tham chiếu × 4 hướng × 10 s. Thêm 8 **điểm kiểm thử** nằm lệch lưới, thu vào *thời điểm khác* với lúc thu radio map.
- **Chỉ số:** sai số Euclid giữa vị trí ước lượng và vị trí thật; báo cáo trung bình, trung vị, phân vị 90, lớn nhất, và đường CDF.
- **Chọn k không nhìn tập kiểm thử:** thử k ∈ {1, 3, 5, 7} với trọng số đều và 1/d, chọn cấu hình có sai số leave-one-out nhỏ nhất *trên điểm tham chiếu*. Tập kiểm thử chỉ được chấm một lần.

| Thí nghiệm | Câu hỏi |
|---|---|
| E1 | k và kiểu trọng số nào tốt nhất (leave-one-out)? |
| E2 | WKNN so với KNN, điểm gần nhất (k = 1), "beacon gần nhất" và weighted centroid |
| E3 | Tiền xử lý có giúp ích không (trung bình thô so với cửa sổ 2/3/4 s, trung bình trọng số so với trung vị)? |
| E4 | Thu 1 hướng so với 4 hướng |
| E5 | Radio map của máy này dùng cho máy kia được không; mean-centering có bù được lệch không? |
| E6 | Bớt một beacon thì sai số tăng bao nhiêu? |
| E7 | Kích hoạt zone: bộ nhận diện zone so với geofence trên toạ độ WKNN |

Chạy toàn bộ bằng một lệnh (xem `docs/indoor-positioning.md`). Script dùng **chính mã nguồn thuật toán chạy trên điện thoại**.

## 6. Kết quả

*Điền từ `report.md`; chèn hình `cdf-<thiết bị>.svg`.*

| Phương pháp (tập kiểm thử) | Trung bình (m) | Trung vị (m) | P90 (m) | Max (m) |
|---|---|---|---|---|
| WKNN (k = …) | … | … | … | … |
| KNN (k = …) | … | … | … | … |
| Beacon gần nhất | … | … | … | … |
| Weighted centroid | … | … | … | … |

Mô hình suy hao đo được: P₀ ≈ … dBm, n ≈ … . Tỉ lệ kích hoạt đúng zone: bộ nhận diện … %, geofence … %.

## 7. Hạn chế

- Chỉ 3 beacon nên fingerprint có 3 chiều. Góc phòng không có beacon là vùng sai số lớn nhất (thí nghiệm E6 lượng hoá điều này).
- Chỉ hoạt động khi app đang mở, vì quét BLE nền không được bật.
- Radio map gắn với một căn phòng và một dòng máy; đổi phòng phải calibration lại (app có chế độ thu nhanh 9 điểm × 5 s).
- Đông người hấp thụ sóng 2,4 GHz làm RSSI lệch khỏi radio map.

## 8. Kịch bản demo

1. Đặt 3 beacon ở 3 góc, mở admin → **Bản đồ** để khớp kích thước phòng và vị trí beacon.
2. Calibration nhanh trên từng điện thoại, bấm **Áp dụng** các gợi ý `minRssi`.
3. Đứng giữa phòng: chưa thuộc zone nào, marker ở giữa bản đồ.
4. Đi về một góc: marker di chuyển theo; khoảng 3 s sau zone được xác nhận, thông báo hiện lên; chạm vào để nghe thuyết minh.
5. Bật **Giải thích thuật toán** để trình bày vector RSSI, k láng giềng và trọng số ngay trên bản đồ.
