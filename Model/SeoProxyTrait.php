<?php

namespace Hexmedia\AdministratorBundle\Model;


/**
 * Trait SeoTrait
 * @package Hexmedia\AdministratorBundle\Entity
 */
trait SeoProxyTrait {


    /**
     * Get seoTitle
     *
     * @return string
     */
    public function getSeoTitle()
    {
        return $this->proxyCurrentLocaleTranslation('getSeoTitle');
    }

    /**
     * Set seoTitle
     *
     * @param string $seoTitle
     * @return Page
     */
    public function setSeoTitle($seoTitle)
    {
        $this->proxyCurrentLocaleTranslation('setSeoTitle', [$seoTitle]);

        return $this;
    }

    /**
     * Get seoKeywords
     *
     * @return string
     */
    public function getSeoKeywords()
    {
        return $this->proxyCurrentLocaleTranslation('getSeoKeywords');
    }

    /**
     * Set seoKeywords
     *
     * @param string $seoKeywords
     * @return Page
     */
    public function setSeoKeywords($seoKeywords)
    {
        $this->proxyCurrentLocaleTranslation('setSeoKeywords', [$seoKeywords]);

        return $this;
    }

    /**
     * Get seoDescription
     *
     * @return string
     */
    public function getSeoDescription()
    {
        return $this->proxyCurrentLocaleTranslation('getSeoDescription');
    }

    /**
     * Set seoDescription
     *
     * @param string $seoDescription
     * @return Page
     */
    public function setSeoDescription($seoDescription)
    {
        $this->proxyCurrentLocaleTranslation('setSeoDescription', [$seoDescription]);

        return $this;
    }

    /**
     * Returns an array of the fields used to generate the slug.
     *
     * @return array
     */
    public function getSluggableFields()
    {
        return ['title'];
    }
}