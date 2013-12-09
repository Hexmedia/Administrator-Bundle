<?php

namespace Hexmedia\AdministratorBundle\Model;


/**
 * Trait SeoTrait
 * @package Hexmedia\AdministratorBundle\Entity
 */
trait SluggableProxyTrait {


    /**
     * Get seoTitle
     *
     * @return string
     */
    public function getSlug()
    {
        return $this->proxyCurrentLocaleTranslation('getSlug');
    }
}