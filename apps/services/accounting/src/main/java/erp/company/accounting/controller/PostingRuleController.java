package erp.company.accounting.controller;

import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.web.PageableDefault;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import erp.company.accounting.dto.PostingRuleDTO;
import erp.company.accounting.entity.PostingRule;
import erp.company.accounting.entity.enums.ModuleSource;
import erp.company.accounting.service.PostingRuleService;

import java.util.List;

@RestController
@RequestMapping("/posting_rules")
@RequiredArgsConstructor
@CrossOrigin(origins = "*")
public class PostingRuleController {

    private final PostingRuleService postingRuleService;

    // 1. GET List & Validation
    // Frontend JS: postingRulesService.getAll() & checkEventCodeExists
    @GetMapping
    public ResponseEntity<?> getPostingRules(
            @RequestParam(required = false) String keyword,
            @RequestParam(required = false, name = "module_source") ModuleSource moduleSource,
            @RequestParam(required = false, name = "account_id") Integer accountId,
            @RequestParam(required = false, name = "is_active") Boolean isActive,
            @RequestParam(required = false, name = "event_code") String checkCode,
            @PageableDefault(size = 1000) Pageable pageable) {

        if (checkCode != null) {
            boolean exists = postingRuleService.isEventCodeExists(checkCode, null);
            return ResponseEntity.ok(exists ? List.of(new Object()) : List.of());
        }

        Page<PostingRule> page = postingRuleService.getPostingRules(keyword, moduleSource, accountId, isActive, pageable);
        return ResponseEntity.ok(page.getContent());
    }

    // 2. GET Detail
    @GetMapping("/{id}")
    public ResponseEntity<PostingRuleDTO> getRuleById(@PathVariable Integer id) {
        return ResponseEntity.ok(postingRuleService.getRuleById(id));
    }

    // 3. POST Create
    @PostMapping
    public ResponseEntity<PostingRule> createRule(@Valid @RequestBody PostingRuleDTO dto) {
        return ResponseEntity.ok(postingRuleService.createRule(dto));
    }

    // 4. PUT Update
    @PutMapping("/{id}")
    public ResponseEntity<PostingRule> updateRule(@PathVariable Integer id, @Valid @RequestBody PostingRuleDTO dto) {
        return ResponseEntity.ok(postingRuleService.updateRule(id, dto));
    }

    // 5. PATCH Soft Delete / Restore
    @PatchMapping("/{id}")
    public ResponseEntity<Void> toggleActive(@PathVariable Integer id, @RequestBody PostingRuleDTO dto) {
        // Logic đơn giản hóa: Frontend gửi { is_active: false } -> Xóa mềm
        if (Boolean.FALSE.equals(dto.getIsActive())) {
            postingRuleService.deleteRule(id);
        } else {
             // Logic restore nếu cần
             PostingRuleDTO restoreDto = new PostingRuleDTO();
             restoreDto.setIsActive(true);
             postingRuleService.updateRule(id, restoreDto);
        }
        return ResponseEntity.ok().build();
    }

    // 6. DELETE Hard Delete
    @DeleteMapping("/{id}")
    public ResponseEntity<Void> deleteRule(@PathVariable Integer id) {
        postingRuleService.deleteRule(id); 
        return ResponseEntity.noContent().build();
    }
}